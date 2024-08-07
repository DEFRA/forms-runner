import {
  ComponentType,
  type FileUploadFieldComponent,
  type Page
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type Request, type ResponseToolkit } from '@hapi/hapi'
import { type ValidationResult } from 'joi'

import {
  type FormSubmissionError,
  type FormPayload,
  type FormSubmissionErrors
} from '../types.js'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import {
  initiateUpload,
  getUploadStatus,
  type UploadStatusResponse
} from '~/src/server/plugins/engine/services/uploadService.js'

export class FileUploadPageController extends PageController {
  fileUploadComponent: FileUploadFieldComponent

  constructor(model: FormModel, pageDef: Page) {
    const fileUploadComponent = pageDef.components?.find(
      (c) => c.type === ComponentType.FileUploadField
    )

    if (!fileUploadComponent) {
      throw Boom.badImplementation(
        `No FileUploadFieldComponent found in FileUploadPageController '${pageDef.path}'`
      )
    }

    super(model, pageDef)

    this.fileUploadComponent = fileUploadComponent
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

    return files
  }

  private async getUpload(request: Request) {
    const { cacheService } = request.services([])
    let upload = await cacheService.getUploadState(request)

    const initiateAndStoreNewUpload = async () => {
      const formId = this.model.options.formId
      const outputEmail =
        this.model.def.outputEmail ?? 'defraforms@defra.gov.uk'
      const initiateResponse = await initiateUpload(
        formId,
        request.path,
        outputEmail
      )
      await cacheService.setUploadState(request, initiateResponse)

      return initiateResponse
    }

    if (upload?.uploadId) {
      // If there is a current upload check
      // it hasn't been consumed and re-use it
      const uploadId = upload.uploadId
      const statusResponse = await getUploadStatus(uploadId)

      if (statusResponse?.uploadStatus !== 'initiated') {
        // Store the current upload in the state
        const state = await cacheService.getState(request)
        const pageState = this.section
          ? (state[this.section.name] ?? {})
          : state
        const fileUploadComponentName = this.getComponentName()
        const files = pageState[fileUploadComponentName] ?? []
        const file = statusResponse?.form.file

        // Only add to files state if the file is an object.
        // This secures against html tampering of the file input
        // by adding a 'multiple' attribute or it being
        // changed to a simple text field or similar.
        if (file && typeof file === 'object' && !Array.isArray(file)) {
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

  private async refreshFileUploadStatus(request: Request) {
    const { cacheService } = request.services([])
    const files = await this.getFilesFromState(request)

    // Refresh any unresolved uploads
    const promises: Promise<UploadStatusResponse | undefined>[] = []
    const indexes: number[] = []
    files.forEach((file, index: number) => {
      if (file.status.uploadStatus === 'pending') {
        promises.push(getUploadStatus(file.uploadId))
        indexes.push(index)
      }
    })

    if (promises.length) {
      const result = await Promise.all(promises)
      indexes.forEach((idx, index) => {
        files[idx].status = result[index]
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
