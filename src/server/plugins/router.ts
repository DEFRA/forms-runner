import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ServerRegisterPluginObject } from '@hapi/hapi'
import humanizeDuration from 'humanize-duration'
import Joi from 'joi'

import {
  defaultConsent,
  parseCookieConsent,
  serialiseCookieConsent
} from '~/src/common/cookies.js'
import { type CookieConsent } from '~/src/common/types.js'
import { config } from '~/src/config/index.js'
import { isPathRelative } from '~/src/server/plugins/engine/helpers.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import { healthRoute, publicRoutes } from '~/src/server/routes/index.js'
import { crumbSchema } from '~/src/server/schemas/index.js'

const routes = [...publicRoutes, healthRoute]

export default {
  plugin: {
    name: 'router',
    register: (server) => {
      server.route(routes)

      // Shared help routes params schema & options
      const params = Joi.object()
        .keys({
          slug: slugSchema
        })
        .required()

      const options = {
        validate: {
          params
        }
      }

      server.route<{ Params: { slug: string } }>({
        method: 'get',
        path: '/help/get-support/{slug}',
        async handler(request, h) {
          const { slug } = request.params
          const form = await getFormMetadata(slug)

          return h.view('help/get-support', { form })
        },
        options
      })

      server.route<{ Params: { slug: string } }>({
        method: 'get',
        path: '/help/privacy/{slug}',
        async handler(request, h) {
          const { slug } = request.params
          const form = await getFormMetadata(slug)

          return h.view('help/privacy-notice', { form })
        },
        options
      })

      server.route<{ Params: { slug: string } }>({
        method: 'get',
        path: '/help/cookies/{slug}',
        handler(_request, h) {
          const sessionTimeout = config.get('sessionTimeout')

          const sessionDurationPretty = humanizeDuration(sessionTimeout)

          return h.view('help/cookies', {
            googleAnalyticsContainerId: config
              .get('googleAnalyticsTrackingId')
              .replace(/^G-/, ''),
            sessionDurationPretty
          })
        },
        options
      })

      server.route<{
        Params: { slug: string }
        Payload: {
          crumb?: string
          'cookies[analytics]'?: string
          'cookies[dismissed]'?: string
        }
        Query: { returnUrl?: string }
      }>({
        method: 'post',
        path: '/help/cookie-preferences/{slug}',
        handler(request, h) {
          const { params, payload, query } = request
          const { slug } = params
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
            returnUrl = `/help/cookie-preferences/${slug}`
          }

          const serialisedCookieConsent = serialiseCookieConsent(cookieConsent)
          h.state('cookieConsent', serialisedCookieConsent)

          return h.redirect(returnUrl)
        },
        options: {
          validate: {
            params,
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
          throw Boom.notFound()
        }
      })

      server.route<{ Params: { slug: string } }>({
        method: 'get',
        path: '/help/cookie-preferences/{slug}',
        handler(request, h) {
          const { params } = request
          const { slug } = params
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
            request.info.referrer.endsWith(`/help/cookie-preferences/${slug}`)

          return h.view('help/cookie-preferences', {
            cookieConsentUpdated: showConsentSuccess
          })
        },
        options
      })

      server.route<{ Params: { slug: string } }>({
        method: 'get',
        path: '/help/accessibility-statement/{slug}',
        handler(_request, h) {
          return h.view('help/accessibility-statement')
        },
        options
      })
    }
  }
} satisfies ServerRegisterPluginObject<void>
