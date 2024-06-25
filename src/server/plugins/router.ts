import { type Request, type ResponseToolkit } from '@hapi/hapi'

import { redirectTo } from '~/src/server/plugins/engine/index.js'
import { healthRoute, publicRoutes } from '~/src/server/routes/index.js'

const routes = [...publicRoutes, healthRoute]

export default {
  plugin: {
    name: 'router',
    register: (server) => {
      server.route(routes)
      server.route([
        {
          method: 'get',
          path: '/help/get-support/{slug?}',
          handler(request: Request, h: ResponseToolkit) {
            const slug = request.params.slug as string
            const viewName = 'help/get-support'

            // If there's no slug in the path,
            // return the generic help page
            if (!slug) {
              return h.view(viewName)
            }

            return h.view(viewName, { slug })
          }
        },
        {
          method: 'get',
          path: '/help/privacy',
          handler(_request: Request, h: ResponseToolkit) {
            return h.view('help/privacy')
          }
        },
        {
          method: 'get',
          path: '/help/cookies',
          handler(_request: Request, h: ResponseToolkit) {
            return h.view('help/cookies')
          }
        }
      ])

      server.route({
        method: 'get',
        path: '/help/accessibility-statement',
        handler(_request: Request, h: ResponseToolkit) {
          return h.view('help/accessibility-statement')
        }
      })

      server.route({
        method: 'get',
        path: '/clear-session',
        handler(request: Request, h: ResponseToolkit) {
          request.yar.reset()

          const { redirect } = request.query
          return redirectTo(request, h, (redirect as string) || '/')
        }
      })
    }
  }
}
