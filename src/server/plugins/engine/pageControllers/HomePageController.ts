import { type RouteOptions } from '@hapi/hapi'

import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import {
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'

export class HomePageController extends QuestionPageController {
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
