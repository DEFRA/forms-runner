import {
  ComponentType,
  type FileUploadFieldComponent,
  type Page
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type Request, type ResponseToolkit } from '@hapi/hapi'
import joi, { type ValidationResult } from 'joi'

import {
  uploadIdSchema,
  tempItemSchema,
  tempStatusSchema
} from '~/src/server/plugins/engine/components/FileUploadField.js'
import { type FormComponentViewModel } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import {
  initiateUpload,
  getUploadStatus,
  type UploadStatusResponse
} from '~/src/server/plugins/engine/services/uploadService.js'
import {
  type FormSubmissionError,
  type FormPayload,
  type FormSubmissionErrors,
  type FileState,
  type FilesState,
  UploadStatus,
  type FormSubmissionState,
  type FileUploadPageViewModel
} from '~/src/server/plugins/engine/types.js'

export class FileUploadPageController extends PageController {
  viewName = 'file-upload'
  fileUploadComponent: FileUploadFieldComponent

  constructor(model: FormModel, pageDef: Page) {
    // Get the file upload components from the list of components
    const fileUploadComponents = pageDef.components?.filter(
      (c) => c.type === ComponentType.FileUploadField
    )

    // Assert we have exactly 1 file upload component
    if (!fileUploadComponents || fileUploadComponents.length !== 1) {
      throw Boom.badImplementation(
        `Expected 1 FileUploadFieldComponent in FileUploadPageController '${pageDef.path}'`
      )
    }

    super(model, pageDef)

    // Assign the file upload component to the controller
    this.fileUploadComponent = fileUploadComponents[0]
  }

  async getState(request: Request) {
    // Get the actual state
    const state = await super.getState(request)
    const name = this.getComponentName()
    const files = request.app.files

    // Now merge in the temporary state (overwriting the files in state)
    if (this.section) {
      if (!state[this.section.name]) {
        state[this.section.name] = {}
      }
      state[this.section.name][name] = files
    } else {
      state[name] = files
    }

    return state
  }

  async setState(request: Request, state: FormSubmissionState) {
    // Update the upload state
    const { cacheService } = request.services([])
    const uploadState = await cacheService.getUploadState(request)

    // Clear down any temp files not included
    // in the state getting saved for this page
    const componentName = this.getComponentName()
    const stateFileIds = state[componentName].map(
      (file: FileState) => file.uploadId
    )
    uploadState.files = uploadState.files.filter((file) =>
      stateFileIds.includes(file.uploadId)
    )

    await cacheService.mergeUploadState(request, uploadState)

    return super.setState(request, state)
  }

  makeGetRouteHandler() {
    return async (request: Request, h: ResponseToolkit) => {
      await this.refreshUpload(request)

      return super.makeGetRouteHandler()(request, h)
    }
  }

  makePostRouteHandler() {
    return async (request: Request, h: ResponseToolkit) => {
      await this.refreshUpload(request)

      return super.makePostRouteHandler()(request, h)
    }
  }

  protected getPayload(request: Request) {
    const payload = (request.payload || {}) as FormPayload
    const name = this.getComponentName()
    const value = payload[name]
    const validateResult = joi
      .array()
      .items(uploadIdSchema)
      .single()
      .default([])
      .validate(value)

    if (!validateResult.error) {
      const files = (request.app.files || []) as FilesState
      payload[name] = validateResult.value.map((str: string) => {
        return files.find((file) => file.uploadId === str)
      })
      payload[name].formAction = files.formAction
    }

    return payload
  }

  getErrors(
    validationResult?: Pick<ValidationResult, 'error'>
  ): FormSubmissionErrors | undefined {
    if (validationResult?.error) {
      const errorList: FormSubmissionError[] = []
      const arraySizeErrorTypes = ['array.min', 'array.max', 'array.length']
      const componentName = this.getComponentName()

      validationResult.error.details.forEach((err) => {
        const type = err.type
        const path = err.path.join('.')
        const formatter = (name: string | number, index: number) =>
          index > 0 ? `__${name}` : name
        const name = err.path.map(formatter).join('')
        const href = `#${name}`
        const lastPath = err.path[err.path.length - 1]

        if (path.startsWith(componentName)) {
          if (type === 'any.required' && path === name) {
            errorList.push({ path, href, name, text: err.message })
          } else if (type === 'any.only' && lastPath === 'fileStatus') {
            if (err.context?.value === 'pending') {
              const text = 'The selected file has not fully uploaded'
              errorList.push({ path, href, name, text })
            }
          } else if (type === 'object.unknown' && lastPath === 'errorMessage') {
            const text = err.context?.value as string
            errorList.push({ path, href, name, text })
          } else if (arraySizeErrorTypes.includes(type)) {
            errorList.push({ path, href, name, text: err.message })
          }
        } else {
          // The error is for another field on the
          // page so defer to the standard getError
          errorList.push(this.getError(err))
        }
      })

      return {
        titleText: this.errorSummaryTitle,
        errorList
      }
    }
  }

  getViewModel(
    payload: FormPayload,
    errors?: FormSubmissionErrors
  ): FileUploadPageViewModel {
    const viewModel = super.getViewModel(
      payload,
      errors
    ) as FileUploadPageViewModel

    const fileUploadComponent = viewModel.components.find(
      (component) => component.model.id === this.fileUploadComponent.name
    ) as FormComponentViewModel

    viewModel.fileUploadComponent = fileUploadComponent

    return viewModel
  }

  private getComponentName() {
    return this.fileUploadComponent.name
  }

  /**
   * Returns the CDP upload from state (separate to form state)
   *
   * If one exists and hasn't been consumed, re-use it otherwise
   * we initiate a new one.
   *
   * For all of the files stored in state that are pending,
   * refresh their status as they may now be `complete` or `rejected`.
   * @param request - the hapi request
   */
  private async refreshUpload(request: Request) {
    const { cacheService } = request.services([])
    const uploadState = await cacheService.getUploadState(request)
    let upload = uploadState.upload

    /**
     * @todo don't initiate anymore after `this.fileUploadComponent.options.max`
     */
    const initiateAndStoreNewUpload = async () => {
      const formId = this.model.options.formId

      if (!formId) {
        throw Boom.badRequest('Unable to initiate an upload without a formId')
      }

      const outputEmail =
        this.model.def.outputEmail ?? 'defraforms@defra.gov.uk'
      const initiateResponse = await initiateUpload(
        formId,
        request.path,
        outputEmail
      )

      if (initiateResponse === undefined) {
        throw Boom.badRequest('Unexpected empty response from initiateUpload')
      }

      await cacheService.mergeUploadState(request, {
        upload: initiateResponse,
        files: uploadState.files
      })

      return initiateResponse
    }

    if (upload?.uploadId) {
      // If there is a current upload check
      // it hasn't been consumed and re-use it
      const uploadId = upload.uploadId
      const statusResponse = await getUploadStatus(uploadId)

      if (statusResponse === undefined) {
        throw Boom.badRequest(
          `Unexpected empty response from getUploadStatus for ${uploadId}`
        )
      }

      // If the upload is no longer in an "initiated" status,
      // store it in the temp state and initiate a new CDP upload
      if (statusResponse.uploadStatus !== UploadStatus.initiated) {
        // Only add to files state if the file is an object.
        // This secures against html tampering of the file input
        // by adding a 'multiple' attribute or it being
        // changed to a simple text field or similar.
        const validateResult = tempItemSchema.validate({
          uploadId,
          status: statusResponse
        })

        if (!validateResult.error) {
          uploadState.files.unshift(validateResult.value)
        }

        upload = await initiateAndStoreNewUpload()
      }
    } else {
      upload = await initiateAndStoreNewUpload()
    }

    // For all of the files stored in state that are pending,
    // refresh their status as they may now be `complete` or `rejected`.
    const files = uploadState.files
    const promises: Promise<UploadStatusResponse | undefined>[] = []
    const indexes: number[] = []

    // Refresh any pending uploads
    files.forEach((file: FileState, index: number) => {
      if (file.status.uploadStatus === UploadStatus.pending) {
        promises.push(getUploadStatus(file.uploadId))
        indexes.push(index)
      }
    })

    if (promises.length) {
      const results = await Promise.allSettled(promises)

      // Update state with the latest result
      indexes.forEach((idx, index) => {
        const result = results[index]

        if (result.status === 'fulfilled') {
          const validateResult = tempStatusSchema.validate(result.value)

          if (!validateResult.error) {
            files[idx].status = validateResult.value
          }
        }
      })

      await cacheService.mergeUploadState(request, { upload, files })
    }

    // Store the formAction on the array
    const filesState = files as FilesState
    filesState.formAction = upload.uploadUrl

    // Store the file and the upload on the request
    request.app.files = filesState
    request.app.upload = upload

    return upload
  }
}
