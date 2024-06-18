import { type Request, type ResponseToolkit } from '@hapi/hapi'

import { redirectTo } from '~/src/server/plugins/engine/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
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
          async handler(request: Request, h: ResponseToolkit) {
            const { slug } = request.params
            const viewName = 'help/get-support'

            // If there's no slug in the path,
            // return the generic help page
            if (!slug) {
              return h.view(viewName)
            }

            const form = await getFormMetadata(slug as string)

            return h.view(viewName, { form })
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

      server.route({
        method: 'get',
        path: '/timeout',
        handler(request: Request, h: ResponseToolkit) {
          request.yar.reset()

          let startPage = '/'

          const { referer } = request.headers

          if (referer) {
            const match = referer.match(/https?:\/\/[^/]+\/([^/]+).*/)
            if (match && match.length > 1) {
              startPage = `/${match[1]}`
            }
          }

          return h.view('timeout', {
            startPage
          })
        }
      })
    }
  }
}
