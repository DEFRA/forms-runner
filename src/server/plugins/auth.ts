import Bell from '@hapi/bell'
import AuthCookie from '@hapi/cookie'
import { type Request, type ResponseToolkit } from '@hapi/hapi'

import config from '~/src/server/config.js'
import { redirectTo } from '~/src/server/plugins/engine/index.js'

export const shouldLogin = (request: Request) =>
  config.authEnabled && !request.auth.isAuthenticated

export default {
  plugin: {
    name: 'auth',
    register: async (server) => {
      if (!config.authEnabled) {
        return
      }

      await server.register(AuthCookie)
      await server.register(Bell)

      server.auth.strategy('session', 'cookie', {
        cookie: {
          name: 'auth',
          password: config.sessionCookiePassword,
          isSecure: true
        }
      })

      server.auth.strategy('oauth', 'bell', {
        provider: {
          name: 'oauth',
          protocol: 'oauth2',
          auth: config.authClientAuthUrl,
          token: config.authClientTokenUrl,
          scope: ['read write'],
          profile: async (credentials, _params, get) => {
            // eslint-disable-next-line camelcase
            const { email, first_name, last_name, user_id } = await get(
              config.authClientProfileUrl
            )
            // eslint-disable-next-line camelcase
            credentials.profile = { email, first_name, last_name, user_id }
          }
        },
        password: config.sessionCookiePassword,
        clientId: config.authClientId,
        clientSecret: config.authClientSecret,
        forceHttps: config.serviceUrl.startsWith('https')
      })

      server.auth.default({ strategy: 'session', mode: 'try' })

      server.route({
        method: ['GET', 'POST'],
        path: '/login',
        config: {
          auth: 'oauth',
          handler: (request: Request, h: ResponseToolkit) => {
            if (request.auth.isAuthenticated) {
              request.cookieAuth.set(request.auth.credentials.profile)
              const returnUrl = request.auth.credentials.query?.returnUrl || '/'
              return redirectTo(request, h, returnUrl)
            }

            return h.response(JSON.stringify(request))
          }
        }
      })

      server.route({
        method: 'get',
        path: '/logout',
        handler: async (request: Request, h: ResponseToolkit) => {
          request.cookieAuth.clear()
          request.yar.reset()

          return redirectTo(request, h, '/')
        }
      })
    }
  }
}
