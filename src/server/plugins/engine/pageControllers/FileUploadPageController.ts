import {
  ComponentType,
  type FileUploadFieldComponent,
  type Page
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type ResponseObject,
  type Request,
  type ResponseToolkit
} from '@hapi/hapi'

import { type ComponentCollectionViewModel } from '../components/types.js'
import { type FormPayload, type FormSubmissionErrors } from '../types.js'

import { type PageControllerBase } from './PageControllerBase.js'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import {
  initiateUpload,
  getUploadStatus
} from '~/src/server/plugins/engine/services/uploadService.js'

export class FileUploadPageController extends PageController {
  constructor(model: FormModel, pageDef: Page) {
    const name = FileUploadPageController.getComponentName(pageDef.path)
    const fileUploadComponent: FileUploadFieldComponent = {
      type: ComponentType.FileUploadField,
      name,
      title: 'Upload a file',
      options: {
        required: true,
        accept: '.doc,.docx,.csv,.odt,.xlsx,.xls,.rtf,.txt,.pdf,.jpeg,.jpg,.png'
      },
      schema: {
        min: 1,
        max: 10
      }
    }

    pageDef.components?.push(fileUploadComponent)

    super(model, pageDef)
  }

  makeGetRouteHandler() {
    return async (request: Request, h: ResponseToolkit) => {
      await this.getUpload(request)
      await this.refreshFileUploadStatus(request)

      return super.makeGetRouteHandler()(request, h)
    }
  }

  async handlePostRequest(request: Request, h: ResponseToolkit) {
    await this.getUpload(request)

    const files = await this.refreshFileUploadStatus(request)
    const newState = this.getStateFromValidForm({
      [this.getComponentName()]: files
    })
    const stateResult = this.validateState(newState)

    if (stateResult.errors) {
      const { cacheService } = request.services([])
      const payload = (request.payload || {}) as FormPayload
      const state = await cacheService.getState(request)
      const progress = state.progress || []

      return this.renderWithErrors(
        request,
        h,
        payload,
        progress,
        stateResult.errors
      )
    }
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
      // it hasn't been consumed & re-use it
      const uploadId = upload.uploadId
      const statusResponse = await getUploadStatus(uploadId)

      if (statusResponse?.uploadStatus !== 'initiated') {
        // Store the current upload in the state
        const state = await cacheService.getState(request)
        const pageState = this.section ? state[this.section.name] ?? {} : state
        const fileUploadComponentName = `${this.path}_files`
        const files = pageState[fileUploadComponentName] ?? []

        files.unshift({ uploadId, status: statusResponse })

        const update = this.getPartialMergeState({
          [fileUploadComponentName]: files
        })

        await cacheService.mergeState(request, update)

        upload = await initiateAndStoreNewUpload()
      }
    } else {
      upload = await initiateAndStoreNewUpload()
    }

    this.formAction = upload.uploadUrl

    return upload
  }

  getViewModel(
    payload: FormPayload,
    errors?: FormSubmissionErrors
  ): {
    page: PageControllerBase
    name?: string
    pageTitle: string
    sectionTitle?: string
    showTitle: boolean
    components: ComponentCollectionViewModel
    errors?: FormSubmissionErrors
    isStartPage: boolean
    startPage?: ResponseObject
    backLink?: string
    feedbackLink?: string
    serviceUrl: string
    phaseTag?: string | undefined
  } {
    const viewModel = super.getViewModel(payload, errors)

    viewModel.formAction = this.formAction

    return viewModel
  }

  private getComponentName() {
    return FileUploadPageController.getComponentName(this.path)
  }

  private async getFilesFromState(request: Request) {
    const { cacheService } = request.services([])
    const state = await cacheService.getState(request)
    const pageState = this.section ? state[this.section.name] ?? {} : state
    const fileUploadComponentName = this.getComponentName()
    const files = pageState[fileUploadComponentName] ?? []

    return files
  }

  private async refreshFileUploadStatus(request: Request) {
    const { cacheService } = request.services([])
    const files = await this.getFilesFromState(request)

    // Refresh any unresolved uploads
    const promises = []
    const indexes: number[] = []
    files.forEach((file, index) => {
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

  static getComponentName(path: string) {
    return `${path}_files`
  }
}
