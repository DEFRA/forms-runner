/* eslint-disable no-console */

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
  type FormContext,
  type FormContextRequest,
  type FormSubmissionError,
  type FormSubmissionState,
  type ItemDeletePageViewModel,
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
    console.log('🔍 FileUploadPageController constructor:', { pageDef })

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
    const { fileUpload, path } = this

    const state = await super.getState(request)

    state.upload = state.upload ?? {}
    state.upload[path] = state.upload[path] ?? { files: [], upload: undefined }

    // Extract the file IDs submitted via the hidden inputs using the file input's name. (CAN REMOVE THIS NOW I THINK)
    let payloadFileIds: string[] = []
    if (
      request.payload &&
      (request.payload as Record<string, unknown>)[fileUpload.name]
    ) {
      const payload = request.payload as Record<string, unknown>
      const value = payload[fileUpload.name]
      payloadFileIds = Array.isArray(value)
        ? (value as string[])
        : [value as string]
    }

    for (const uploadId of payloadFileIds) {
      const exists = state.upload[path].files.some(
        (file: FileState) => file.uploadId === uploadId
      )
      if (!exists) {
        console.log(
          `🔍 getState - No existing file state for uploadId: ${uploadId}.`
        )
      }
    }

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
    const files = uploadState?.files ?? []
    console.log('🔍 getFilesFromState:', { path, files })
    return files
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

          const formatter = (name: string | number, index: number) =>
            index > 0 ? `__${name}` : name

          if (type === 'object.unknown' && path.at(-1) === 'errorMessage') {
            const name = path.map(formatter).join('')
            const value = context?.value as string | undefined

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
    context: FormContext
  ): FeaturedFormPageViewModel {
    const { fileUpload } = this

    const viewModel = super.getViewModel(request, context)
    const { components } = viewModel

    // Featured form component
    const [formComponent] = components.filter(
      ({ model }) => model.id === fileUpload.name
    )

    const index = components.indexOf(formComponent)

    return {
      ...viewModel,
      formAction: '/initiate-upload', // TODO needs to be suitable for non-JS users
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
      // If we have an uploadId but no URLs, we need to initiate a new upload
      // TODO: This is a temporary fix to ensure we always have URLs.. my local was behaving weirdly with the upload
      if (!upload.uploadUrl || !upload.statusUrl) {
        console.log(
          '🔍 checkUploadStatus - missing URLs, initiating new upload'
        )
        return this.initiateAndStoreNewUpload(request, state)
      }

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
    let upload: UploadInitiateResponse | undefined

    const max = Math.min(schema.max ?? MAX_UPLOADS, MAX_UPLOADS)

    if (files.length < max) {
      const outputEmail =
        this.model.def.outputEmail ?? 'defraforms@defra.gov.uk'
      console.log('🔍 initiateAndStoreNewUpload - initiating upload:', {
        href,
        outputEmail,
        accept: options.accept
      })

      const newUpload = await initiateUpload(
        path,
        outputEmail,
        options.accept,
        href
      )

      if (!newUpload.uploadUrl || !newUpload.statusUrl) {
        console.error(
          '🔥 initiateAndStoreNewUpload - Missing URLs in upload response'
        )
      }

      upload = newUpload
    }

    const newState = await this.mergeState(request, state, {
      upload: { [path]: { files, upload } }
    })

    return newState
  }

  makeGetUploadStatusRouteHandler() {
    return async (
      request: FormRequest,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view' | 'response'>
    ) => {
      const { uploadId } = request.params
      try {
        if (!uploadId) {
          throw new Error('Missing upload id')
        }
        const status = await getUploadStatus(uploadId)
        return h.response(status)
      } catch (error) {
        throw Boom.boomify(error as Error, {
          message: 'Failed to get upload status',
          statusCode: 502
        })
      }
    }
  }

  makeInitiateUploadRouteHandler() {
    return async (
      request: FormRequest,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view' | 'response'>
    ) => {
      try {
        const { mimeTypes } = request.payload as { mimeTypes?: string }
        const outputEmail =
          this.model.def.outputEmail ?? 'defraforms@defra.gov.uk'

        const redirectUrl =
          typeof request.headers.referer === 'string'
            ? request.headers.referer
            : ''

        const newUpload = await initiateUpload(
          this.href,
          outputEmail,
          mimeTypes,
          redirectUrl
        )

        return h.response(newUpload)
      } catch (error) {
        throw Boom.boomify(error as Error, {
          message: 'Failed to initiate upload session'
        })
      }
    }
  }

  makePutCompleteUploadHandler() {
    return async (
      request: FormRequestPayload,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view' | 'response'>
    ) => {
      console.log('🎯 Complete Upload - Starting', {
        uploadId: request.params.uploadId
      })
      const uploadId = request.params.uploadId
      if (!uploadId) {
        console.log('🎯 Complete Upload - Failed: No uploadId provided')
        throw Boom.badRequest('No uploadId provided')
      }

      console.log('🎯 Complete Upload - Fetching status', { uploadId })
      const statusResponse = await getUploadStatus(uploadId)
      if (!statusResponse) {
        console.log('🎯 Complete Upload - Failed: No status found', {
          uploadId
        })
        throw Boom.badRequest(`No upload status found for ${uploadId}`)
      }

      console.log('🎯 Complete Upload - Adding file to state', { uploadId })
      const updatedState = await this.addFileToState(
        request,
        context.state,
        uploadId,
        statusResponse
      )

      console.log('🎯 Complete Upload - Saving state')
      await this.setState(request, updatedState)

      return h.response({ message: 'File added successfully' }).code(200)
    }
  }

  makeDeleteRemoveUploadHandler() {
    return async (
      request: FormRequestPayload,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view' | 'response'>
    ) => {
      console.log('🎯 Remove Upload - Starting', {
        itemId: request.params.itemId
      })
      const { uploadId } = request.params
      const { state } = context

      if (!uploadId) {
        console.log('🎯 Remove Upload - Failed: No itemId provided')
        throw Boom.badRequest('No item ID provided')
      }

      console.log('🎯 Remove Upload - Removing file from state', { uploadId })
      await this.removeFileFromState(request, state, uploadId)

      console.log('🎯 Remove Upload - Saving state')
      await this.setState(request, state)

      console.log('🎯 Remove Upload - Complete, returning success response')
      return h.response({ message: 'File removed successfully' }).code(200)
    }
  }

  private async addFileToState(
    request: FormRequestPayload,
    state: FormSubmissionState,
    uploadId: string,
    statusResponse: UploadStatusResponse
  ) {
    console.log('🎯 Add File To State - Starting', { uploadId })
    const { path } = this
    const files = this.getFilesFromState(state)

    console.log('🎯 Add File To State - Validating file data')
    const validated = tempItemSchema.validate(
      {
        uploadId,
        status: statusResponse
      },
      { stripUnknown: true }
    )

    if (!validated.error) {
      console.log('🎯 Add File To State - Validation successful, adding file')
      files.unshift(prepareFileState(validated.value))
    } else {
      console.log('🎯 Add File To State - Validation failed', {
        error: validated.error
      })
      throw Boom.badRequest(`File failed validation for uploadId ${uploadId}`)
    }

    const upload = this.getUploadFromState(state)
    console.log('🎯 Add File To State - Complete', { filesCount: files.length })
    return this.mergeState(request, state, {
      upload: { [path]: { files, upload } }
    })
  }

  private async removeFileFromState(
    request: FormRequestPayload,
    state: FormSubmissionState,
    removeId: string
  ) {
    console.log('🎯 Remove File From State - Starting', { removeId })
    const { path } = this
    const originalFiles = this.getFilesFromState(state)
    const files = originalFiles.filter((file) => file.uploadId !== removeId)

    console.log('🎯 Remove File From State - Filtered files', {
      originalCount: originalFiles.length,
      newCount: files.length,
      removed: originalFiles.length - files.length
    })

    const upload = this.getUploadFromState(state)
    console.log('🎯 Remove File From State - Complete')
    return this.mergeState(request, state, {
      upload: { [path]: { files, upload } }
    })
  }
}
