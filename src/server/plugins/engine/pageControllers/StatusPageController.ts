import {
  type ResponseObject,
  type Request,
  type ResponseToolkit
} from '@hapi/hapi'

import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'

export class StatusPageController extends PageController {
  makeGetRouteHandler(): (
    request: Request,
    h: ResponseToolkit
  ) => Promise<ResponseObject> {
    return async (request, h) => {
      const model = this.model
      const { cacheService } = request.services([])
      const confirmationState = await cacheService.getConfirmationState(request)

      // If there's no confirmation state, then
      // redirect the user back to the start of the form
      if (!confirmationState) {
        return h.redirect(`/${model.basePath}`).temporary()
      }

      return h.view('confirmation', {
        pageTitle: this.title,
        name: model.name,
        serviceStartPage: `/${model.basePath}`,
        ...confirmationState
      })
    }
  }

  get getRouteOptions() {
    return {
      ext: {
        onPostHandler: {
          method: (_request: Request, h: ResponseToolkit) => {
            return h.continue
          }
        }
      }
    }
  }

  get postRouteOptions() {
    return {
      ext: {
        onPostHandler: {
          method: (_request: Request, h: ResponseToolkit) => {
            return h.continue
          }
        }
      }
    }
  }
}
