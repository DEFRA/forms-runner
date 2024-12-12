import { type PageStatus } from '@defra/forms-model'
import { type ResponseToolkit } from '@hapi/hapi'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageControllerBase } from '~/src/server/plugins/engine/pageControllers/PageControllerBase.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import { type FormRequest } from '~/src/server/routes/types.js'

export class StatusPageController extends PageControllerBase {
  declare pageDef: PageStatus

  constructor(model: FormModel, pageDef: PageStatus) {
    super(model, pageDef)
    this.viewName = 'confirmation'
  }

  makeGetRouteHandler() {
    return async (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { model, title, viewName } = this

      const { cacheService } = request.services([])
      const confirmationState = await cacheService.getConfirmationState(request)

      // If there's no confirmation state, then
      // redirect the user back to the start of the form
      if (!confirmationState.confirmed) {
        return this.proceed(request, h, this.getStartPath())
      }

      const slug = request.params.slug
      const { submissionGuidance } = await getFormMetadata(slug)

      return h.view(viewName, {
        pageTitle: title,
        name: model.name,
        submissionGuidance,
        serviceUrl: this.getHref('/')
      })
    }
  }
}
