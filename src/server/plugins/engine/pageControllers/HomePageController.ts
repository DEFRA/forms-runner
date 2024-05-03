import { type Request, type ResponseToolkit } from '@hapi/hapi'

import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'

export class HomePageController extends PageController {
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
