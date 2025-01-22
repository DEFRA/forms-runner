import { type PageStatus } from '@defra/forms-model'
import { type ResponseToolkit } from '@hapi/hapi'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'
import { type FormRequest } from '~/src/server/routes/types.js'

export class StatusPageController extends QuestionPageController {
  declare pageDef: PageStatus

  constructor(model: FormModel, pageDef: PageStatus) {
    super(model, pageDef)
    this.viewName = 'confirmation'
  }

  getRelevantPath() {
    return this.getStatusPath()
  }

  makeGetRouteHandler() {
    return async (
      request: FormRequest,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { viewModel, viewName } = this

      const { cacheService } = request.services([])
      const confirmationState = await cacheService.getConfirmationState(request)

      // If there's no confirmation state, then
      // redirect the user back to the start of the form
      if (!confirmationState.confirmed) {
        return this.proceed(request, h, this.getStartPath())
      }

      const slug = request.params.slug
      const { formsService } = this.model.services
      const { getFormMetadata } = formsService

      const { submissionGuidance } = await getFormMetadata(slug)

      return h.view(viewName, {
        ...viewModel,
        submissionGuidance
      })
    }
  }
}
