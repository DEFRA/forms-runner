import { type Request, type ResponseToolkit } from '@hapi/hapi'

import { redirectTo } from '~/src/server/plugins/engine/index.js'
import {
  healthRoute,
  publicRoutes,
  homeRoute
} from '~/src/server/routes/index.js'

const routes = [...publicRoutes, healthRoute, homeRoute]

export default {
  plugin: {
    name: 'router',
    register: (server) => {
      server.route(routes)

      server.route({
        method: 'get',
        path: '/clear-session',
        handler: async (request: Request, h: ResponseToolkit) => {
          if (request.yar) {
            request.yar.reset()
          }
          const { redirect } = request.query
          return redirectTo(request, h, (redirect as string) || '/')
        }
      })

      server.route({
        method: 'get',
        path: '/timeout',
        handler: async (request: Request, h: ResponseToolkit) => {
          if (request.yar) {
            request.yar.reset()
          }

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
