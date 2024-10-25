import {
  ComponentType,
  hasComponents,
  type FileUploadFieldComponent,
  type Page
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'
import { type ValidationResult } from 'joi'

import {
  tempItemSchema,
  tempStatusSchema
} from '~/src/server/plugins/engine/components/FileUploadField.js'
import { type FormComponentViewModel } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import {
  getUploadStatus,
  initiateUpload
} from '~/src/server/plugins/engine/services/uploadService.js'
import {
  FileStatus,
  UploadStatus,
  type FileState,
  type FileUploadPageViewModel,
  type FormPayload,
  type FormSubmissionError,
  type FormSubmissionErrors,
  type TempFileState,
  type UploadState,
  type UploadStatusResponse
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'
import { type CacheService } from '~/src/server/services/cacheService.js'

const MAX_UPLOADS = 25

function prepareStatus(status: UploadState) {
  const file = status.form.file
  const isPending = file.fileStatus === FileStatus.pending

  if (!file.errorMessage && isPending) {
    file.errorMessage = 'The selected file has not fully uploaded'
  }

  return status
}

function prepareFileState(fileState: FileState) {
  prepareStatus(fileState.status)

  return fileState
}

export class FileUploadPageController extends PageController {
  viewName = 'file-upload'
  fileUploadComponent: FileUploadFieldComponent

  constructor(model: FormModel, pageDef: Page) {
    // Get the file upload components from the list of components
    const fileUploadComponents = hasComponents(pageDef)
      ? pageDef.components.filter(
          (c) => c.type === ComponentType.FileUploadField
        )
      : []

    // Assert we have exactly 1 file upload component
    if (fileUploadComponents.length !== 1) {
      throw Boom.badImplementation(
        `Expected 1 FileUploadFieldComponent in FileUploadPageController '${pageDef.path}'`
      )
    }

    super(model, pageDef)

    const fileUploadComponent = fileUploadComponents[0]

    // Assert the file upload component is the first form component
    if (this.components.formItems[0].name !== fileUploadComponent.name) {
      throw Boom.badImplementation(
        `Expected '${fileUploadComponent.name}' to be the first form component in FileUploadPageController '${pageDef.path}'`
      )
    }

    // Assign the file upload component to the controller
    this.fileUploadComponent = fileUploadComponents[0]
  }

  async getState(request: FormRequest) {
    // Get the actual state
    const state = await super.getState(request)
    const name = this.getComponentName()
    const files = request.app.files

    // Overwrite the files with those in the upload state
    state[name] = files

    return state
  }

  makeGetRouteHandler() {
    return async (
      request: FormRequest,
      h: ResponseToolkit<FormRequestRefs>
    ) => {
      const { cacheService } = request.services([])
      const state = await cacheService.getUploadState(request)

      await this.refreshUpload(request, state, cacheService)

      return super.makeGetRouteHandler()(request, h)
    }
  }

  makePostRouteHandler() {
    return async (
      request: FormRequestPayload,
      h: ResponseToolkit<FormRequestPayloadRefs>
    ) => {
      const { cacheService } = request.services([])
      const state = await cacheService.getUploadState(request)

      // Check for any removed files in the POST payload
      const removed = await this.checkRemovedFiles(request, state, cacheService)

      if (removed) {
        return h.redirect(request.path)
      }

      await this.refreshUpload(request, state, cacheService)

      return super.makePostRouteHandler()(request, h)
    }
  }

  protected getPayload(request: FormRequestPayload) {
    const payload = super.getPayload(request)
    const name = this.getComponentName()
    const files = request.app.files ?? []

    // Append the files to the payload
    payload[name] = files.length ? files : undefined

    return payload
  }

  getErrors(
    validationResult?: Pick<ValidationResult, 'error'>
  ): FormSubmissionErrors | undefined {
    if (validationResult?.error) {
      const errorList: FormSubmissionError[] = []
      const componentName = this.getComponentName()

      validationResult.error.details.forEach((err) => {
        const isUploadError = err.path[0] === componentName
        const isUploadRootError = isUploadError && err.path.length === 1

        if (!isUploadError || isUploadRootError) {
          // The error is for the root of the upload or another
          // field on the page so defer to the standard getError
          errorList.push(this.getError(err))
        } else {
          const type = err.type
          const path = err.path.join('.')
          const formatter = (name: string | number, index: number) =>
            index > 0 ? `__${name}` : name
          const name = err.path.map(formatter).join('')
          const lastPath = err.path[err.path.length - 1]

          if (type === 'object.unknown' && lastPath === 'errorMessage') {
            const value = err.context?.value

            if (value) {
              const text = typeof value === 'string' ? value : 'Unknown error'
              const href = `#${err.path.slice(0, 2).map(formatter).join('')}`

              errorList.push({ path, href, name, text })
            }
          }
        }
      })

      return {
        titleText: this.errorSummaryTitle,
        errorList
      }
    }
  }

  getViewModel(
    request: FormRequest | FormRequestPayload,
    payload: FormPayload,
    errors?: FormSubmissionErrors
  ): FileUploadPageViewModel {
    const viewModel = super.getViewModel(
      request,
      payload,
      errors
    ) as FileUploadPageViewModel

    const name = this.fileUploadComponent.name
    const components = viewModel.components
    const id = components.findIndex((component) => component.model.id === name)

    viewModel.path = request.path
    viewModel.formAction = request.app.formAction
    viewModel.fileUploadComponent = components[id] as FormComponentViewModel
    viewModel.preUploadComponents = components.slice(0, id)
    viewModel.components = components.slice(id)

    return viewModel
  }

  private getComponentName() {
    return this.fileUploadComponent.name
  }

  /**
   * Refreshes the CDP upload and files in the
   * state and checks for any removed files.
   *
   * If an upload exists and hasn't been consumed
   * it gets re-used, otherwise we initiate a new one.
   *
   * For all of the files stored in state that are `pending`,
   * their status is refreshed as they may now be `complete` or `rejected`.
   * @param request - the hapi request
   * @param state - the upload state
   * @param cacheService - the cache service
   */
  private async refreshUpload(
    request: FormRequest | FormRequestPayload,
    state: TempFileState,
    cacheService: CacheService
  ) {
    await this.checkUploadStatus(request, state, cacheService)

    await this.refreshPendingFiles(request, state, cacheService)

    const { upload, files } = state

    // Store the files and formAction on the request
    request.app.files = files
    request.app.formAction = upload?.uploadUrl
  }

  /**
   * If an upload exists and hasn't been consumed
   * it gets re-used, otherwise a new one is initiated.
   * @param request - the hapi request
   * @param state - the upload state
   * @param cacheService - the cache service
   */
  private async checkUploadStatus(
    request: FormRequest | FormRequestPayload,
    state: TempFileState,
    cacheService: CacheService
  ) {
    const { upload, files } = state

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

      // If the upload is in an "initiated" status, re-use it
      if (statusResponse.uploadStatus === UploadStatus.initiated) {
        return upload
      } else {
        // Only add to files state if the file validates.
        // This secures against html tampering of the file input
        // by adding a 'multiple' attribute or it being
        // changed to a simple text field or similar.
        const validateResult: ValidationResult<FileState> =
          tempItemSchema.validate(
            {
              uploadId,
              status: statusResponse
            },
            { stripUnknown: true }
          )

        if (!validateResult.error) {
          files.unshift(prepareFileState(validateResult.value))
        }

        await this.initiateAndStoreNewUpload(request, state, cacheService)
      }
    } else {
      await this.initiateAndStoreNewUpload(request, state, cacheService)
    }
  }

  /**
   * For all of the files stored in state that are `pending`,
   * their status is refreshed as they may now be `complete` or `rejected`.
   * @param request - the hapi request
   * @param state - the upload state
   * @param cacheService - the cache service
   */
  private async refreshPendingFiles(
    request: FormRequest | FormRequestPayload,
    state: TempFileState,
    cacheService: CacheService
  ) {
    const promises: Promise<UploadStatusResponse | undefined>[] = []
    const indexes: number[] = []

    // Refresh any pending uploads
    state.files.forEach((file: FileState, index: number) => {
      if (file.status.uploadStatus === UploadStatus.pending) {
        promises.push(getUploadStatus(file.uploadId))
        indexes.push(index)
      }
    })

    if (promises.length) {
      let filesUpdated = false
      const results = await Promise.allSettled(promises)

      // Update state with the latest result
      for (let index = 0; index < indexes.length; index++) {
        const idx = indexes[index]
        const result = results[index]

        if (result.status === 'fulfilled') {
          const validateResult: ValidationResult<UploadState> =
            tempStatusSchema.validate(result.value, { stripUnknown: true })

          if (!validateResult.error) {
            state.files[idx].status = prepareStatus(validateResult.value)
            filesUpdated = true
          }
        }
      }

      if (filesUpdated) {
        await cacheService.mergeUploadState(request, state)
      }
    }
  }

  /**
   * Checks the payload for a file getting removed
   * and removes it from the upload files if found
   * @param request - the hapi request
   * @param state - the upload state
   * @param cacheService - the cache service
   * @returns true if any files have been removed otherwise false
   */
  private async checkRemovedFiles(
    request: FormRequestPayload,
    state: TempFileState,
    cacheService: CacheService
  ) {
    const payload = super.getPayload(request)
    const removeId = payload.__remove

    if (removeId) {
      const fileToRemove = state.files.find(
        (file) => file.uploadId === removeId
      )

      if (fileToRemove) {
        state.files = state.files.filter((item) => item !== fileToRemove)

        await cacheService.mergeUploadState(request, state)
      }

      return true
    }

    return false
  }

  /**
   * Initiates a CDP file upload and stores in the upload state
   * @param request - the hapi request
   * @param state - the upload state
   * @param cacheService - the cache service
   */
  private async initiateAndStoreNewUpload(
    request: FormRequest | FormRequestPayload,
    state: TempFileState,
    cacheService: CacheService
  ) {
    const { options, schema } = this.fileUploadComponent

    // Reset the upload in state
    state.upload = undefined

    // Don't initiate anymore after minimum of `schema.max` or MAX_UPLOADS
    const max = Math.min(schema.max ?? MAX_UPLOADS, MAX_UPLOADS)

    if (state.files.length < max) {
      const outputEmail =
        this.model.def.outputEmail ?? 'defraforms@defra.gov.uk'
      const newUpload = await initiateUpload(
        request.path,
        outputEmail,
        options.accept
      )

      if (newUpload === undefined) {
        throw Boom.badRequest('Unexpected empty response from initiateUpload')
      }

      state.upload = newUpload
    }

    await cacheService.mergeUploadState(request, state)
  }
}
