import { type ResponseToolkit } from '@hapi/hapi'

import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import { type FormRequest } from '~/src/server/routes/types.js'

export class StatusPageController extends PageController {
  makeGetRouteHandler() {
    return async (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { model, title } = this

      const { cacheService } = request.services([])
      const confirmationState = await cacheService.getConfirmationState(request)

      // If there's no confirmation state, then
      // redirect the user back to the start of the form
      if (!confirmationState.confirmed) {
        return this.proceed(request, h, this.getStartPath())
      }

      const slug = request.params.slug
      const { submissionGuidance } = await getFormMetadata(slug)

      return h.view('confirmation', {
        pageTitle: title,
        name: model.name,
        submissionGuidance,
        serviceUrl: this.getHref('/')
      })
    }
  }
}
