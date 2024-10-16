import { type RouteOptions } from '@hapi/hapi'

import { PageControllerBase } from '~/src/server/plugins/engine/pageControllers/PageControllerBase.js'
import {
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'

export class PageController extends PageControllerBase {
  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   */
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

  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   */
  get postRouteOptions(): RouteOptions<FormRequestPayloadRefs> {
    return {
      payload: {
        parse: true,
        maxBytes: Number.MAX_SAFE_INTEGER,
        failAction: 'ignore'
      },
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
