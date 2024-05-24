import { type Request, type ResponseToolkit } from '@hapi/hapi'
import Joi from 'joi'

import config from '~/src/server/config.js'
import { redirectTo } from '~/src/server/plugins/engine/index.js'
import {
  healthRoute,
  publicRoutes,
  homeRoute
} from '~/src/server/routes/index.js'
import getRequestInfo from '~/src/server/utils/getRequestInfo.js'

const routes = [...publicRoutes, healthRoute, homeRoute]

enum CookieValue {
  Accept = 'accept',
  Reject = 'reject'
}

// TODO: Replace with `type Cookies = `${CookieValue}`;` when Prettier is updated to a version later than 2.2
type Cookies = 'accept' | 'reject'

interface CookiePayload {
  cookies: Cookies
  crumb: string
  referrer: string
}

export default {
  plugin: {
    name: 'router',
    register: (server) => {
      server.route(routes)
      server.route([
        {
          method: 'get',
          path: '/help/privacy',
          handler: async (_request: Request, h: ResponseToolkit) => {
            if (config.privacyPolicyUrl) {
              return h.redirect(config.privacyPolicyUrl)
            }
            return h.view('help/privacy')
          }
        },
        {
          method: 'get',
          path: '/help/cookies',
          handler: async (request: Request, h: ResponseToolkit) => {
            const cookiesPolicy = request.state.cookies_policy
            const analytics =
              cookiesPolicy?.analytics === 'on' ? 'accept' : 'reject'
            return h.view('help/cookies', {
              analytics
            })
          }
        },
        {
          method: 'post',
          options: {
            payload: {
              parse: true,
              multipart: true,
              failAction: async (request: Request, h: ResponseToolkit) => {
                request.server.plugins.crumb.generate?.(request, h)
                return h.continue
              }
            },
            validate: {
              payload: Joi.object({
                cookies: Joi.string()
                  .valid(CookieValue.Accept, CookieValue.Reject)
                  .required(),
                crumb: Joi.string()
              }).required()
            }
          },
          path: '/help/cookies',
          handler: async (request: Request, h: ResponseToolkit) => {
            const { cookies } = request.payload as CookiePayload
            const accept = cookies === 'accept'

            const { referrer } = getRequestInfo(request)
            let redirectPath = '/help/cookies'

            if (referrer) {
              redirectPath = new URL(referrer).pathname
            }

            return h.redirect(redirectPath).state(
              'cookies_policy',
              {
                isHttpOnly: false, // Set this to false so that Google tag manager can read cookie preferences
                isSet: true,
                essential: true,
                analytics: accept ? 'on' : 'off',
                usage: accept
              },
              {
                isHttpOnly: false,
                path: '/'
              }
            )
          }
        }
      ])

      server.route({
        method: 'get',
        path: '/help/terms-and-conditions',
        handler: async (_request: Request, h: ResponseToolkit) => {
          return h.view('help/terms-and-conditions')
        }
      })

      server.route({
        method: 'get',
        path: '/help/accessibility-statement',
        handler: async (_request: Request, h: ResponseToolkit) => {
          return h.view('help/accessibility-statement')
        }
      })

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
