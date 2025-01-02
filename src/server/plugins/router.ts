import Boom from '@hapi/boom'
import { type ServerRegisterPluginObject } from '@hapi/hapi'
import Joi from 'joi'

import {
  defaultConsent,
  parseCookieConsent,
  serialiseCookieConsent
} from '~/src/common/cookies.js'
import { type CookieConsent } from '~/src/common/types.js'
import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { isPathRelative } from '~/src/server/plugins/engine/helpers.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import { healthRoute, publicRoutes } from '~/src/server/routes/index.js'
import { crumbSchema } from '~/src/server/schemas/index.js'

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
          return h.view('help/cookies', {
            googleAnalyticsContainerId: config
              .get('googleAnalyticsTrackingId')
              .replace(/^G-/, '')
          })
        }
      })

      server.route<{
        Payload: {
          crumb?: string
          'cookies[analytics]'?: string
          'cookies[dismissed]'?: string
        }
        Query: { returnUrl?: string }
      }>({
        method: 'post',
        path: '/help/cookie-preferences',
        handler(request, h) {
          const { payload, query } = request
          let { returnUrl } = query

          if (returnUrl && !isPathRelative(returnUrl)) {
            throw Boom.badRequest('Return URL must be relative')
          }

          const analyticsDecision = (
            payload['cookies[analytics]'] ?? ''
          ).toLowerCase()

          const dismissedDecision = (
            payload['cookies[dismissed]'] ?? ''
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

          if (!returnUrl) {
            cookieConsent.dismissed = true // this page already has a confirmation message, don't show another
            returnUrl = '/help/cookie-preferences'
          }

          const serialisedCookieConsent = serialiseCookieConsent(cookieConsent)
          h.state('cookieConsent', serialisedCookieConsent)

          return h.redirect(returnUrl)
        },
        options: {
          validate: {
            payload: Joi.object({
              crumb: crumbSchema,
              'cookies[analytics]': Joi.string().valid('yes', 'no').optional(),
              'cookies[dismissed]': Joi.string().valid('yes', 'no').optional()
            }),
            query: Joi.object({
              returnUrl: Joi.string().optional()
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
        handler(request, h) {
          let cookieConsentDismissed = false

          if (typeof request.state.cookieConsent === 'string') {
            const cookieConsent = parseCookieConsent(
              request.state.cookieConsent
            )

            cookieConsentDismissed = cookieConsent.dismissed
          }

          // if the user has come back to this page after updating their preferences
          // override the 'dismissed' behaviour to show a success notification instead of
          // the cookie banner
          const showConsentSuccess =
            cookieConsentDismissed &&
            request.info.referrer.endsWith('/help/cookie-preferences')

          return h.view('help/cookie-preferences', {
            cookieConsentUpdated: showConsentSuccess
          })
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
