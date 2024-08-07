import {
  ComponentType,
  type FileUploadFieldComponent,
  type Page
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type Request, type ResponseToolkit } from '@hapi/hapi'
import { type ValidationResult } from 'joi'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import {
  initiateUpload,
  getUploadStatus,
  type UploadStatusResponse,
  type UploadInitiateResponse
} from '~/src/server/plugins/engine/services/uploadService.js'
import {
  type FormSubmissionError,
  type FormPayload,
  type FormSubmissionErrors,
  type FileState,
  UploadStatus
} from '~/src/server/plugins/engine/types.js'

export class FileUploadPageController extends PageController {
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

  makeGetRouteHandler() {
    return async (request: Request, h: ResponseToolkit) => {
      await this.getUpload(request)
      await this.refreshFileUploadStatus(request)

      return super.makeGetRouteHandler()(request, h)
    }
  }

  makePostRouteHandler() {
    return async (request: Request, h: ResponseToolkit) => {
      await this.getUpload(request)
      const files = await this.refreshFileUploadStatus(request)

      // PageControllerBase.makePostRouteHandler expects the values
      // of components to be sent in the form POST payload.
      // For CDP File Uploads, this isn't the case, so we manipulate
      // the payload here and add in the files as if they came from the form.
      if (!request.payload) {
        request.payload = {}
      }

      if (typeof request.payload === 'object') {
        request.payload[this.getComponentName()] = files
      }

      return super.makePostRouteHandler()(request, h)
    }
  }

  protected async preparePayloadForViewModel(
    request: Request,
    payload: FormPayload
  ): Promise<void> {
    const upload = await this.getUpload(request)
    payload.formAction = upload.uploadUrl
  }

  getErrors(
    validationResult?: Pick<ValidationResult, 'error'>
  ): FormSubmissionErrors | undefined {
    if (validationResult?.error) {
      const errorList: FormSubmissionError[] = []
      const arraySizeErrorTypes = ['array.min', 'array.max', 'array.length']

      validationResult.error.details.forEach((err) => {
        const type = err.type
        const path = err.path.join('.')
        const formatter = (name: string | number, index: number) =>
          index > 0 ? `__${name}` : name
        const name = err.path.map(formatter).join('')
        const href = `#${name}`
        const lastPath = err.path[err.path.length - 1]

        if (type === 'any.only' && lastPath === 'fileStatus') {
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
      })

      return {
        titleText: this.errorSummaryTitle,
        errorList
      }
    }
  }

  private getComponentName() {
    return this.fileUploadComponent.name
  }

  private async getFilesFromState(request: Request) {
    const { cacheService } = request.services([])
    const state = await cacheService.getState(request)
    const pageState = this.section ? (state[this.section.name] ?? {}) : state
    const fileUploadComponentName = this.getComponentName()
    const files = pageState[fileUploadComponentName] ?? []

    return files as FileState[]
  }

  /**
   * Returns the CDP upload from state (separate to form state)
   * If one exists and hasn't been consumed, re-use it otherwise
   * we initiate a new one.
   * @param request - the hapi request
   */
  private async getUpload(request: Request) {
    const { cacheService } = request.services([])
    let upload = (await cacheService.getUploadState(request)) as
      | UploadInitiateResponse
      | undefined

    /**
     * @todo don't initiate anymore after `this.fileUploadComponent.options.max`
     */
    const initiateAndStoreNewUpload = async () => {
      const formId = this.model.options.formId
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

      await cacheService.setUploadState(request, initiateResponse)

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
      // store it in the state and initiate a new CDP upload
      if (statusResponse.uploadStatus !== UploadStatus.initiated) {
        const state = await cacheService.getState(request)
        const pageState = this.section
          ? (state[this.section.name] ?? {})
          : state
        const fileUploadComponentName = this.getComponentName()
        const files = (pageState[fileUploadComponentName] ?? []) as FileState[]
        const file = statusResponse.form.file

        // Only add to files state if the file is an object.
        // This secures against html tampering of the file input
        // by adding a 'multiple' attribute or it being
        // changed to a simple text field or similar.
        if (typeof file === 'object' && !Array.isArray(file)) {
          files.unshift({ uploadId, status: statusResponse })

          const update = this.getPartialMergeState({
            [fileUploadComponentName]: files
          })

          await cacheService.mergeState(request, update)
        }

        upload = await initiateAndStoreNewUpload()
      }
    } else {
      upload = await initiateAndStoreNewUpload()
    }

    return upload
  }

  /**
   * For all of the files stored in state that are pending,
   * refresh their status as they may now be `complete` or `rejected`.
   */
  private async refreshFileUploadStatus(request: Request) {
    const { cacheService } = request.services([])
    const files = await this.getFilesFromState(request)

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
      const results = await Promise.all(promises)

      // Update state with the latest result
      indexes.forEach((idx, index) => {
        const result = results[index]

        if (result !== undefined) {
          files[idx].status = result
        }
      })

      const update = this.getPartialMergeState({
        [this.getComponentName()]: files
      })

      await cacheService.mergeState(request, update)
    }

    return files
  }

  get viewName() {
    return 'file-upload'
  }
}
