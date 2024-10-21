import { type RouteOptions } from '@hapi/hapi'

import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import {
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'

export class HomePageController extends PageController {
  get getRouteOptions(): RouteOptions<FormRequestRefs> {
    return {
      ext: {
        onPostHandler: {
          method(_request, h) {
            return h.continue
          }
        }
      }
    }
  }

  get postRouteOptions(): RouteOptions<FormRequestPayloadRefs> {
    return {
      ext: {
        onPostHandler: {
          method(_request, h) {
            return h.continue
          }
        }
      }
    }
  }
}
