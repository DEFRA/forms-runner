import { ComponentType, type PageFileUpload } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'
import { type ValidationErrorItem, type ValidationResult } from 'joi'

import {
  tempItemSchema,
  tempStatusSchema,
  type FileUploadField
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
  type FeaturedFormPageViewModel,
  type FileState,
  type FormContextRequest,
  type FormPayload,
  type FormSubmissionError,
  type FormSubmissionState,
  type UploadInitiateResponse,
  type UploadStatusFileResponse,
  type UploadStatusResponse
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

const MAX_UPLOADS = 25

function prepareStatus(status: UploadStatusFileResponse) {
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

  fileUpload: FileUploadField
  fileDeleteViewName = 'item-delete'

  constructor(model: FormModel, pageDef: PageFileUpload) {
    super(model, pageDef)

    const { collection } = this

    // Get the file upload fields from the collection
    const fileUploads = collection.fields.filter(
      (field): field is FileUploadField =>
        field.type === ComponentType.FileUploadField
    )

    const fileUpload = fileUploads.at(0)

    // Assert we have exactly 1 file upload component
    if (!fileUpload || fileUploads.length > 1) {
      throw Boom.badImplementation(
        `Expected 1 FileUploadFieldComponent in FileUploadPageController '${pageDef.path}'`
      )
    }

    // Assert the file upload component is the first form component
    if (collection.fields.indexOf(fileUpload) !== 0) {
      throw Boom.badImplementation(
        `Expected '${fileUpload.name}' to be the first form component in FileUploadPageController '${pageDef.path}'`
      )
    }

    // Assign the file upload component to the controller
    this.fileUpload = fileUpload
    this.viewName = 'file-upload'
  }

  getFormDataFromState(
    request: FormContextRequest | undefined,
    state: FormSubmissionState
  ) {
    const { fileUpload } = this

    const payload = super.getFormDataFromState(request, state)
    const files = this.getFilesFromState(state)

    // Append the files to the payload
    payload[fileUpload.name] = files.length ? files : undefined

    return payload
  }

  async getState(request: FormRequest | FormRequestPayload) {
    const { fileUpload } = this

    // Get the actual state
    const state = await super.getState(request)
    const files = this.getFilesFromState(state)

    // Overwrite the files with those in the upload state
    state[fileUpload.name] = files

    return state
  }

  /**
   * Get the uploaded files from state.
   */
  getFilesFromState(state: FormSubmissionState) {
    const { path } = this

    const uploadState = state.upload?.[path]
    return uploadState?.files ?? []
  }

  /**
   * Get the initiated upload from state.
   */
  getUploadFromState(state: FormSubmissionState) {
    const { path } = this

    const uploadState = state.upload?.[path]
    return uploadState?.upload
  }

  makeGetRouteHandler() {
    return async (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const state = await this.getState(request)

      await this.refreshUpload(request, state)

      return super.makeGetRouteHandler()(request, h)
    }
  }

  makeGetItemDeleteRouteHandler() {
    return async (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { viewModel } = this
      const { params } = request

      const state = await this.getState(request)
      const files = this.getFilesFromState(state)

      const fileToRemove = files.find(
        ({ uploadId }) => uploadId === params.itemId
      )

      if (!fileToRemove) {
        return Boom.notFound('File to delete not found')
      }

      const { filename: itemTitle } = fileToRemove.status.form.file

      const { progress = [] } = await this.updateProgress(request, state)

      return h.view(this.fileDeleteViewName, {
        ...viewModel,

        backLink: this.getBackLink(progress),
        showTitle: false,

        field: {
          name: 'confirm',
          fieldset: {
            legend: {
              text: `Are you sure you want to remove ${itemTitle} from this form?`,
              isPageHeading: true,
              classes: 'govuk-fieldset__legend--l'
            }
          },
          items: [
            {
              value: true,
              text: `Yes, remove ${itemTitle}`
            },
            {
              value: false,
              text: 'No'
            }
          ],
          value: true
        }
      })
    }
  }

  makePostItemDeleteRouteHandler() {
    return async (
      request: FormRequestPayload,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { path } = this

      const { confirm } = this.getFormParams(request)

      // Check for any removed files in the POST payload
      if (confirm) {
        const state = await this.getState(request)

        await this.checkRemovedFiles(request, state)
        return this.proceed(request, h, path)
      }

      return this.proceed(request, h)
    }
  }

  makePostRouteHandler() {
    return async (
      request: FormRequestPayload,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const state = await this.getState(request)

      await this.refreshUpload(request, state)

      return super.makePostRouteHandler()(request, h)
    }
  }

  getErrors(details?: ValidationErrorItem[]) {
    const { fileUpload } = this

    if (details) {
      const errors: FormSubmissionError[] = []

      details.forEach((error) => {
        const isUploadError = error.path[0] === fileUpload.name
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
    state: FormSubmissionState,
    payload: FormPayload,
    errors?: FormSubmissionError[]
  ): FeaturedFormPageViewModel {
    const { fileUpload } = this

    const upload = this.getUploadFromState(state)

    const viewModel = super.getViewModel(request, state, payload, errors)
    const { components } = viewModel

    // Featured form component
    const [formComponent] = components.filter(
      ({ model }) => model.id === fileUpload.name
    )

    const index = components.indexOf(formComponent)

    return {
      ...viewModel,
      formAction: upload?.uploadUrl,
      formComponent,

      // Split out components before/after
      componentsBefore: components.slice(0, index),
      components: components.slice(index)
    }
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
   * @param state - the form state
   */
  private async refreshUpload(
    request: FormRequest | FormRequestPayload,
    state: FormSubmissionState
  ) {
    state = await this.checkUploadStatus(request, state)
    state = await this.refreshPendingFiles(request, state)

    return state
  }

  /**
   * If an upload exists and hasn't been consumed
   * it gets re-used, otherwise a new one is initiated.
   * @param request - the hapi request
   * @param state - the form state
   */
  private async checkUploadStatus(
    request: FormRequest | FormRequestPayload,
    state: FormSubmissionState
  ) {
    const upload = this.getUploadFromState(state)
    const files = this.getFilesFromState(state)

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
        return state
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

        return this.initiateAndStoreNewUpload(request, state)
      }
    } else {
      return this.initiateAndStoreNewUpload(request, state)
    }
  }

  /**
   * For all of the files stored in state that are `pending`,
   * their status is refreshed as they may now be `complete` or `rejected`.
   * @param request - the hapi request
   * @param state - the form state
   */
  private async refreshPendingFiles(
    request: FormRequest | FormRequestPayload,
    state: FormSubmissionState
  ) {
    const { path } = this

    const upload = this.getUploadFromState(state)
    const files = this.getFilesFromState(state)

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
      let filesUpdated = false
      const results = await Promise.allSettled(promises)

      // Update state with the latest result
      for (let index = 0; index < indexes.length; index++) {
        const idx = indexes[index]
        const result = results[index]

        if (result.status === 'fulfilled') {
          const validateResult: ValidationResult<UploadStatusFileResponse> =
            tempStatusSchema.validate(result.value, { stripUnknown: true })

          if (!validateResult.error) {
            files[idx].status = prepareStatus(validateResult.value)
            filesUpdated = true
          }
        }
      }

      if (filesUpdated) {
        return this.mergeState(request, state, {
          upload: { [path]: { files, upload } }
        })
      }
    }

    return state
  }

  /**
   * Checks the payload for a file getting removed
   * and removes it from the upload files if found
   * @param request - the hapi request
   * @param state - the form state
   * @returns updated state if any files have been removed
   */
  private async checkRemovedFiles(
    request: FormRequestPayload,
    state: FormSubmissionState
  ) {
    const { path } = this
    const { params } = request

    const upload = this.getUploadFromState(state)
    const files = this.getFilesFromState(state)

    const filesUpdated = files.filter(
      ({ uploadId }) => uploadId !== params.itemId
    )

    if (filesUpdated.length === files.length) {
      return
    }

    await this.mergeState(request, state, {
      upload: { [path]: { files: filesUpdated, upload } }
    })
  }

  /**
   * Initiates a CDP file upload and stores in the upload state
   * @param request - the hapi request
   * @param state - the form state
   */
  private async initiateAndStoreNewUpload(
    request: FormRequest | FormRequestPayload,
    state: FormSubmissionState
  ) {
    const { fileUpload, href, path } = this
    const { options, schema } = fileUpload

    const files = this.getFilesFromState(state)

    // Reset the upload in state
    let upload: UploadInitiateResponse | undefined

    // Don't initiate anymore after minimum of `schema.max` or MAX_UPLOADS
    const max = Math.min(schema.max ?? MAX_UPLOADS, MAX_UPLOADS)

    if (files.length < max) {
      const outputEmail =
        this.model.def.outputEmail ?? 'defraforms@defra.gov.uk'

      const newUpload = await initiateUpload(href, outputEmail, options.accept)

      if (newUpload === undefined) {
        throw Boom.badRequest('Unexpected empty response from initiateUpload')
      }

      upload = newUpload
    }

    return this.mergeState(request, state, {
      upload: { [path]: { files, upload } }
    })
  }
}
