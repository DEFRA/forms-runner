import Boom from '@hapi/boom'
import { type ServerRegisterPluginObject } from '@hapi/hapi'
import Joi from 'joi'

import {
  defaultConsent,
  parseCookieConsent,
  serialiseCookieConsent
} from '~/src/common/cookies.js'
import { type CookieConsent } from '~/src/common/types.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import { healthRoute, publicRoutes } from '~/src/server/routes/index.js'

const routes = [...publicRoutes, healthRoute]

const logger = createLogger()

export default {
  plugin: {
    name: 'router',
    register: (server) => {
      server.route(routes)

      server.route<{ Params: { slug?: string } }>({
        method: 'get',
        path: '/help/get-support/{slug?}',
        async handler(request, h) {
          const { slug } = request.params
          const viewName = 'help/get-support'

          // If there's no slug in the path,
          // return the generic help page
          if (!slug) {
            return h.view(viewName)
          }

          const form = await getFormMetadata(slug)

          return h.view(viewName, { form })
        }
      })

      server.route<{ Params: { slug: string } }>({
        method: 'get',
        path: '/help/privacy/{slug}',
        async handler(request, h) {
          const { slug } = request.params

          const form = await getFormMetadata(slug)
          const { privacyNoticeUrl } = form

          if (!privacyNoticeUrl) {
            logger.error(`Privacy notice not found for slug ${slug}`)
            return Boom.notFound()
          }

          return h.redirect(privacyNoticeUrl)
        }
      })

      server.route({
        method: 'get',
        path: '/help/cookies',
        handler(_request, h) {
          return h.view('help/cookies')
        }
      })

      server.route<{
        Payload: {
          'cookies[analytics]'?: string
          'cookies[dismissed]'?: string
        }
      }>({
        method: 'post',
        path: '/help/cookie-preferences',
        handler(request, h) {
          const analyticsDecision = (
            request.payload['cookies[analytics]'] ?? ''
          ).toLowerCase()

          const dismissedDecision = (
            request.payload['cookies[dismissed]'] ?? ''
          ).toLowerCase()

          // move the parser into our JS code so we can delegate to the frontend in a future iteration
          let cookieConsent: CookieConsent

          if (typeof request.state.cookieConsent === 'string') {
            cookieConsent = parseCookieConsent(request.state.cookieConsent)
          } else {
            cookieConsent = defaultConsent
          }

          if (analyticsDecision) {
            cookieConsent.analytics = analyticsDecision === 'yes'
            cookieConsent.dismissed = false
          }

          if (dismissedDecision) {
            cookieConsent.dismissed = dismissedDecision === 'yes'
          }

          const serialisedCookieConsent = serialiseCookieConsent(cookieConsent)
          h.state('cookieConsent', serialisedCookieConsent)

          return h.redirect(request.info.referrer)
        },
        options: {
          validate: {
            payload: Joi.object({
              'cookies[analytics]': Joi.string().valid('yes', 'no').optional(),
              'cookies[dismissed]': Joi.string().valid('yes', 'no').optional()
            })
          }
        }
      })

      server.route({
        method: 'get',
        path: '/',
        handler() {
          return Boom.notFound()
        }
      })

      server.route({
        method: 'get',
        path: '/help/cookie-preferences',
        handler(_request, h) {
          return h.view('help/cookie-preferences')
        }
      })

      server.route({
        method: 'get',
        path: '/help/accessibility-statement',
        handler(_request, h) {
          return h.view('help/accessibility-statement')
        }
      })
    }
  }
} satisfies ServerRegisterPluginObject<void>
