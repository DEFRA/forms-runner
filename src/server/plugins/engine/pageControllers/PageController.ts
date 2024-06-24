import { type Request, type ResponseToolkit } from '@hapi/hapi'

import { PageControllerBase } from '~/src/server/plugins/engine/pageControllers/PageControllerBase.js'

export class PageController extends PageControllerBase {
  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   */
  get getRouteOptions(): {
    ext: any
  } {
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

  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   */
  get postRouteOptions(): {
    payload?: any
    ext: any
  } {
    return {
      payload: {
        output: 'stream',
        parse: true,
        maxBytes: Number.MAX_SAFE_INTEGER,
        failAction: 'ignore'
      },
      ext: {
        onPostHandler: {
          method: async (_request: Request, h: ResponseToolkit) => {
            return h.continue
          }
        }
      }
    }
  }
}
