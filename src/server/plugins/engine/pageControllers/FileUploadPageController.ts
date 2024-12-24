import {
  ComponentType,
  hasComponents,
  type FileUploadFieldComponent,
  type PageFileUpload
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'
import { type ValidationErrorItem, type ValidationResult } from 'joi'

import {
  tempItemSchema,
  tempStatusSchema
} from '~/src/server/plugins/engine/components/FileUploadField.js'
import { getError } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import {
  getUploadStatus,
  initiateUpload
} from '~/src/server/plugins/engine/services/uploadService.js'
import {
  FileStatus,
  UploadStatus,
  type FileState,
  type FileUploadPageViewModel,
  type FormContextRequest,
  type FormPayload,
  type FormSubmissionError,
  type TempFileState,
  type UploadState,
  type UploadStatusResponse
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

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

export class FileUploadPageController extends QuestionPageController {
  declare pageDef: PageFileUpload

  fileUploadComponent: FileUploadFieldComponent

  constructor(model: FormModel, pageDef: PageFileUpload) {
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
    if (this.collection.fields[0].name !== fileUploadComponent.name) {
      throw Boom.badImplementation(
        `Expected '${fileUploadComponent.name}' to be the first form component in FileUploadPageController '${pageDef.path}'`
      )
    }

    // Assign the file upload component to the controller
    this.fileUploadComponent = fileUploadComponents[0]
    this.viewName = 'file-upload'
  }

  getFormData(request: FormContextRequest) {
    const formData = super.getFormData(request)

    const name = this.getComponentName()
    const files = request.app.files ?? []

    // Append the files to the payload
    formData[name] = files.length ? files : undefined

    return formData
  }

  async getState(request: FormRequest | FormRequestPayload) {
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
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { path } = request

      const state = await this.getState(request)
      const uploadState = state.upload?.[path] ?? { files: [] }

      await this.refreshUpload(request, uploadState)

      return super.makeGetRouteHandler()(request, h)
    }
  }

  makePostRouteHandler() {
    return async (
      request: FormRequestPayload,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { path } = request

      const state = await this.getState(request)
      const uploadState = state.upload?.[path] ?? { files: [] }

      // Check for any removed files in the POST payload
      const removed = await this.checkRemovedFiles(request, uploadState)

      if (removed) {
        return this.proceed(request, h, this.path)
      }

      await this.refreshUpload(request, uploadState)

      return super.makePostRouteHandler()(request, h)
    }
  }

  getErrors(details?: ValidationErrorItem[]) {
    if (details) {
      const errors: FormSubmissionError[] = []
      const componentName = this.getComponentName()

      details.forEach((error) => {
        const isUploadError = error.path[0] === componentName
        const isUploadRootError = isUploadError && error.path.length === 1

        if (!isUploadError || isUploadRootError) {
          // The error is for the root of the upload or another
          // field on the page so defer to the getError helper
          errors.push(getError(error))
        } else {
          const { context, path, type } = error

          const formatter = (name: string | number, index: number) =>
            index > 0 ? `__${name}` : name

          if (type === 'object.unknown' && path.at(-1) === 'errorMessage') {
            const name = path.map(formatter).join('')
            const value = context?.value

            if (value) {
              const text = typeof value === 'string' ? value : 'Unknown error'
              const href = `#${path.slice(0, 2).map(formatter).join('')}`

              errors.push({ path, href, name, text })
            }
          }
        }
      })

      return errors
    }
  }

  getViewModel(
    request: FormContextRequest,
    payload: FormPayload,
    errors?: FormSubmissionError[]
  ): FileUploadPageViewModel {
    const viewModel = super.getViewModel(request, payload, errors)

    const name = this.fileUploadComponent.name
    const components = viewModel.components

    const [fileUploadComponent] = components.filter(
      (component) => component.model.id === name
    )

    const id = components.indexOf(fileUploadComponent)
    viewModel.components = components.slice(id)

    return {
      ...viewModel,
      path: request.path,
      formAction: request.app.formAction,
      fileUploadComponent,
      preUploadComponents: components.slice(0, id)
    }
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
   * @param uploadState - the upload state
   */
  private async refreshUpload(
    request: FormRequest | FormRequestPayload,
    uploadState: TempFileState
  ) {
    await this.checkUploadStatus(request, uploadState)
    await this.refreshPendingFiles(request, uploadState)

    const { upload, files } = uploadState

    // Store the files and formAction on the request
    request.app.files = files
    request.app.formAction = upload?.uploadUrl
  }

  /**
   * If an upload exists and hasn't been consumed
   * it gets re-used, otherwise a new one is initiated.
   * @param request - the hapi request
   * @param uploadState - the upload state
   */
  private async checkUploadStatus(
    request: FormRequest | FormRequestPayload,
    uploadState: TempFileState
  ) {
    const { upload, files } = uploadState

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

        await this.initiateAndStoreNewUpload(request, uploadState)
      }
    } else {
      await this.initiateAndStoreNewUpload(request, uploadState)
    }
  }

  /**
   * For all of the files stored in state that are `pending`,
   * their status is refreshed as they may now be `complete` or `rejected`.
   * @param request - the hapi request
   * @param uploadState - the upload state
   */
  private async refreshPendingFiles(
    request: FormRequest | FormRequestPayload,
    uploadState: TempFileState
  ) {
    const promises: Promise<UploadStatusResponse | undefined>[] = []
    const indexes: number[] = []

    // Refresh any pending uploads
    uploadState.files.forEach((file: FileState, index: number) => {
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
            uploadState.files[idx].status = prepareStatus(validateResult.value)
            filesUpdated = true
          }
        }
      }

      if (filesUpdated) {
        const { path } = request
        await this.setState(request, {
          upload: { [path]: uploadState }
        })
      }
    }
  }

  /**
   * Checks the payload for a file getting removed
   * and removes it from the upload files if found
   * @param request - the hapi request
   * @param uploadState - the upload state
   * @returns true if any files have been removed otherwise false
   */
  private async checkRemovedFiles(
    request: FormRequestPayload,
    uploadState: TempFileState
  ) {
    const { __remove: removeId } = this.getFormData(request)

    if (removeId) {
      const fileToRemove = uploadState.files.find(
        (file) => file.uploadId === removeId
      )

      if (fileToRemove) {
        uploadState.files = uploadState.files.filter(
          (item) => item !== fileToRemove
        )

        const { path } = request
        await this.setState(request, {
          upload: { [path]: uploadState }
        })
      }

      return true
    }

    return false
  }

  /**
   * Initiates a CDP file upload and stores in the upload state
   * @param request - the hapi request
   * @param uploadState - the upload state
   */
  private async initiateAndStoreNewUpload(
    request: FormRequest | FormRequestPayload,
    uploadState: TempFileState
  ) {
    const { options, schema } = this.fileUploadComponent

    // Reset the upload in state
    uploadState.upload = undefined

    // Don't initiate anymore after minimum of `schema.max` or MAX_UPLOADS
    const max = Math.min(schema.max ?? MAX_UPLOADS, MAX_UPLOADS)

    if (uploadState.files.length < max) {
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

      uploadState.upload = newUpload
    }

    const path = request.path

    await this.setState(request, {
      upload: { [path]: uploadState }
    })
  }
}
