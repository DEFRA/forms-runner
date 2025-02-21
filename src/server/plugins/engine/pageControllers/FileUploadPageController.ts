import { ComponentType, type PageFileUpload } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'
import { wait } from '@hapi/hoek'
import { type ValidationErrorItem } from 'joi'

import {
  tempItemSchema,
  type FileUploadField
} from '~/src/server/plugins/engine/components/FileUploadField.js'
import {
  getError,
  getExponentialBackoffDelay
} from '~/src/server/plugins/engine/helpers.js'
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
  type FormContext,
  type FormContextRequest,
  type FormSubmissionError,
  type FormSubmissionState,
  type ItemDeletePageViewModel,
  type UploadInitiateResponse,
  type UploadStatusFileResponse
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

const MAX_UPLOADS = 25
const CDP_UPLOAD_TIMEOUT_MS = 60000 // 1 minute

export function prepareStatus(status: UploadStatusFileResponse) {
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

    return this.refreshUpload(request, state)
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

  makeGetItemDeleteRouteHandler() {
    return (
      request: FormRequest,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { viewModel } = this
      const { params } = request
      const { state } = context

      const files = this.getFilesFromState(state)

      const fileToRemove = files.find(
        ({ uploadId }) => uploadId === params.itemId
      )

      if (!fileToRemove) {
        throw Boom.notFound('File to delete not found')
      }

      const { filename } = fileToRemove.status.form.file

      return h.view(this.fileDeleteViewName, {
        ...viewModel,
        context,
        backLink: this.getBackLink(request, context),
        pageTitle: `Are you sure you want to remove this file?`,
        itemTitle: filename,
        confirmation: { text: 'You cannot recover removed files.' },
        buttonConfirm: { text: 'Remove file' },
        buttonCancel: { text: 'Cancel' }
      } satisfies ItemDeletePageViewModel)
    }
  }

  makePostItemDeleteRouteHandler() {
    return async (
      request: FormRequestPayload,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { path } = this
      const { state } = context

      const { confirm } = this.getFormParams(request)

      // Check for any removed files in the POST payload
      if (confirm) {
        await this.checkRemovedFiles(request, state)
        return this.proceed(request, h, path)
      }

      return this.proceed(request, h)
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

          if (type === 'object.unknown' && path.at(-1) === 'errorMessage') {
            const value = context?.value as string | undefined

            if (value) {
              const name = fileUpload.name
              const text = typeof value === 'string' ? value : 'Unknown error'
              const href = `#${name}`

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
    context: FormContext
  ): FeaturedFormPageViewModel {
    const { fileUpload } = this
    const { state } = context

    const upload = this.getUploadFromState(state)

    const viewModel = super.getViewModel(request, context)
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
   * @param request - the hapi request
   * @param state - the form state
   */
  private async refreshUpload(
    request: FormRequest | FormRequestPayload,
    state: FormSubmissionState
  ) {
    state = await this.checkUploadStatus(request, state)

    return state
  }

  /**
   * If an upload exists and hasn't been consumed
   * it gets re-used, otherwise a new one is initiated.
   * @param request - the hapi request
   * @param state - the form state
   * @param depth - the number of retries so far
   */
  private async checkUploadStatus(
    request: FormRequest | FormRequestPayload,
    state: FormSubmissionState,
    depth = 1
  ): Promise<FormSubmissionState> {
    const upload = this.getUploadFromState(state)
    const files = this.getFilesFromState(state)

    // If no upload exists, initiate a new one.
    if (!upload?.uploadId) {
      return this.initiateAndStoreNewUpload(request, state)
    }

    const uploadId = upload.uploadId
    const statusResponse = await getUploadStatus(uploadId)
    if (!statusResponse) {
      throw Boom.badRequest(
        `Unexpected empty response from getUploadStatus for ${uploadId}`
      )
    }

    // Re-use the upload if it is still in the "initiated" state.
    if (statusResponse.uploadStatus === UploadStatus.initiated) {
      return state
    }

    if (statusResponse.uploadStatus === UploadStatus.pending) {
      // Using exponential backoff delays:
      // Depth 1: 2000ms, Depth 2: 4000ms, Depth 3: 8000ms, Depth 4: 16000ms, Depth 5+: 30000ms (capped)
      // A depth of 5 (or more) implies cumulative delays roughly reaching 60 seconds.
      if (depth >= 5) {
        request.logger.error(
          `Exceeded cumulative retry delay for ${uploadId} (depth: ${depth}). Re-initiating a new upload.`
        )
        await this.initiateAndStoreNewUpload(request, state)
        throw Boom.gatewayTimeout(
          `Timed out waiting for ${uploadId} after cumulative retries exceeding ${((CDP_UPLOAD_TIMEOUT_MS - 5000) / 1000).toFixed(0)} seconds`
        )
      }
      const delay = getExponentialBackoffDelay(depth)
      request.logger.info(
        `Waiting ${delay / 1000} seconds for ${uploadId} to complete (depth: ${depth})`
      )
      await wait(delay)
      return this.checkUploadStatus(request, state, depth + 1)
    }

    // Only add to files state if the file validates.
    // This secures against html tampering of the file input
    // by adding a 'multiple' attribute or it being
    // changed to a simple text field or similar.
    const validationResult = tempItemSchema.validate(
      { uploadId, status: statusResponse },
      { stripUnknown: true }
    )
    const error = validationResult.error
    const fileState = validationResult.value as FileState

    if (error) {
      return this.initiateAndStoreNewUpload(request, state)
    }

    const file = fileState.status.form.file
    if (file.fileStatus === FileStatus.complete) {
      files.unshift(prepareFileState(fileState))
      await this.mergeState(request, state, {
        upload: { [this.path]: { files, upload } }
      })
    } else {
      // Flash the error message.
      const { fileUpload } = this
      const { cacheService } = request.services([])
      const name = fileUpload.name
      const text = file.errorMessage ?? 'Unknown error'
      const errors: FormSubmissionError[] = [
        { path: [name], href: `#${name}`, name, text }
      ]
      cacheService.setFlash(request, { errors })
    }

    return this.initiateAndStoreNewUpload(request, state)
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
