import { type Boom } from '@hapi/boom'
import { type ResponseObject, type ResponseToolkit } from '@hapi/hapi'

import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import {
  type FormRequest,
  type FormRequestRefs
} from '~/src/server/routes/types.js'

export class StatusPageController extends PageController {
  makeGetRouteHandler(): (
    request: FormRequest,
    h: ResponseToolkit<FormRequestRefs>
  ) => Promise<ResponseObject | Boom> {
    return async (request, h) => {
      const model = this.model
      const { cacheService } = request.services([])
      const confirmationState = await cacheService.getConfirmationState(request)

      // If there's no confirmation state, then
      // redirect the user back to the start of the form
      if (!confirmationState.confirmed) {
        return h.redirect(this.getStartPath())
      }

      const slug = request.params.slug
      const { submissionGuidance } = await getFormMetadata(slug)

      return h.view('confirmation', {
        pageTitle: this.title,
        name: model.name,
        submissionGuidance,
        serviceUrl: `/${model.basePath}`
      })
    }
  }
}
