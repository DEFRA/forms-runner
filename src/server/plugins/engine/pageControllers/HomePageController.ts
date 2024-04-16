import { PageController } from './PageController'
import type { Request, ResponseToolkit } from '@hapi/hapi'

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
