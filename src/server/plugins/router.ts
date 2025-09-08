import {
  getCacheService,
  handleLegacyRedirect,
  isPathRelative
} from '@defra/forms-engine-plugin/engine/helpers.js'
import {
  crumbSchema,
  itemIdSchema,
  pathSchema,
  stateSchema
} from '@defra/forms-engine-plugin/schema.js'
import {
  type FormRequestPayload,
  type FormStatus
} from '@defra/forms-engine-plugin/types'
import { slugSchema, type SecurityQuestionsEnum } from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type Request,
  type ResponseToolkit,
  type ServerRegisterPluginObject,
  type ServerRoute
} from '@hapi/hapi'
import humanizeDuration from 'humanize-duration'
import Joi from 'joi'

import {
  defaultConsent,
  parseCookieConsent,
  serialiseCookieConsent
} from '~/src/common/cookies.js'
import { type CookieConsent } from '~/src/common/types.js'
import { config } from '~/src/config/index.js'
import { FORM_PREFIX } from '~/src/server/constants.js'
import { publishSaveAndExitEvent } from '~/src/server/messaging/publish.js'
import {
  confirmationViewModel as saveAndExitConfirmationViewModel,
  detailsViewModel as saveAndExitDetailsViewModel,
  getKey,
  paramsSchema as saveAndExitParamsSchema,
  payloadSchema as saveAndExitPayloadSchema,
  type SaveAndExitParams,
  type SaveAndExitPayload
} from '~/src/server/models/save-and-exit.js'
import { getErrorPreviewHandler } from '~/src/server/plugins/error-preview/error-preview.js'
import {
  healthRoute,
  publicRoutes,
  saveAndExitRoutes
} from '~/src/server/routes/index.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'

const routes: ServerRoute[] = [...publicRoutes, healthRoute]
const saveAndExitExpiryDays = config.get('saveAndExitExpiryDays')

export default {
  plugin: {
    name: 'router',
    register: (server) => {
      server.route(routes)
      server.route(saveAndExitRoutes as ServerRoute[])

      // /preview/{state}/{slug} -> {FORM_PREFIX}/preview/{state}/{slug}
      server.route({
        method: 'GET',
        path: '/preview/{state}/{slug}',
        handler: (request: Request, h: ResponseToolkit) => {
          const { state, slug } = request.params
          const { error: stateError } = stateSchema.validate(state)
          const { error: slugError } = slugSchema.validate(slug)

          if (stateError || slugError) {
            throw Boom.notFound()
          }

          const targetUrl = `${FORM_PREFIX}${request.path}${request.url.search}`
          return handleLegacyRedirect(h, targetUrl)
        }
      })

      // /{slug}/{path*} -> {FORM_PREFIX}/{slug}/{path*}
      server.route({
        method: 'GET',
        path: '/{slug}/{path*}',
        handler: (request: Request, h: ResponseToolkit) => {
          const { slug } = request.params
          const { error } = slugSchema.validate(slug)

          if (error) {
            throw Boom.notFound()
          }

          const targetUrl = `${FORM_PREFIX}${request.path}${request.url.search}`
          return handleLegacyRedirect(h, targetUrl)
        }
      })

      // /{slug} -> {FORM_PREFIX}/{slug}
      server.route({
        method: 'GET',
        path: '/{slug}',
        handler: (request: Request, h: ResponseToolkit) => {
          const { slug } = request.params
          const { error } = slugSchema.validate(slug)

          if (error) {
            throw Boom.notFound()
          }
          // Note: Target URL is slightly different for this specific route
          const targetUrl = `${FORM_PREFIX}${request.path}${request.url.search}`
          return handleLegacyRedirect(h, targetUrl)
        }
      })

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

          return h.view('help/privacy-notice', { form, saveAndExitExpiryDays })
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

      server.route({
        method: 'get',
        path: '/error-preview/{state}/{slug}/{path}/{itemId}',
        handler: getErrorPreviewHandler,
        options: {
          validate: {
            params: Joi.object().keys({
              state: stateSchema,
              slug: slugSchema,
              path: pathSchema,
              itemId: itemIdSchema
            })
          }
        }
      })

      server.route<{
        Params: SaveAndExitParams
      }>({
        method: 'GET',
        path: '/save-and-exit/{slug}/{state?}',
        async handler(request, h) {
          const { params } = request
          const { slug, state: status } = params
          const metadata = await getFormMetadata(slug)
          const model = saveAndExitDetailsViewModel(metadata, status)

          return h.view('save-and-exit-details', model)
        },
        options: {
          validate: {
            params: saveAndExitParamsSchema
          }
        }
      })

      server.route<{
        Params: SaveAndExitParams
        Payload: SaveAndExitPayload
      }>({
        method: 'POST',
        path: '/save-and-exit/{slug}/{state?}',
        async handler(request, h) {
          const { params, payload } = request
          const { slug, state: status } = params
          const { email, securityQuestion, securityAnswer } = payload
          const metadata = await getFormMetadata(slug)
          const cacheService = getCacheService(request.server)

          // Publish topic message
          const security = {
            question: securityQuestion as SecurityQuestionsEnum,
            answer: securityAnswer
          }
          const state = await cacheService.getState(
            request as unknown as FormRequestPayload
          )

          await publishSaveAndExitEvent(
            metadata.id,
            metadata.title,
            email,
            security,
            state,
            status
          )

          // Clear all form data
          await cacheService.clearState(
            request as unknown as FormRequestPayload
          )

          // Flash the email over to the confirmation page
          request.yar.flash(getKey(slug, status), email)

          // Redirect to the save and exit confirmation page
          const statusPath = status ? `/${status}` : ''

          return h.redirect(`/save-and-exit/${slug}/confirmation${statusPath}`)
        },
        options: {
          validate: {
            async failAction(request, h, err) {
              const { params, payload } = request
              const { slug, state: status } = params
              const metadata = await getFormMetadata(slug)
              const model = saveAndExitDetailsViewModel(
                metadata,
                payload as SaveAndExitPayload,
                status as FormStatus,
                err
              )

              return h.view('save-and-exit-details', model).takeover()
            },
            params: saveAndExitParamsSchema,
            payload: saveAndExitPayloadSchema
          }
        }
      })

      server.route<{
        Params: SaveAndExitParams
      }>({
        method: 'GET',
        path: '/save-and-exit/{slug}/confirmation/{state?}',
        async handler(request, h) {
          const { params } = request
          const { slug, state: status } = params
          const metadata = await getFormMetadata(slug)

          // Get the flashed email
          const messages = request.yar.flash(getKey(slug, status))

          if (messages.length === 0) {
            return Boom.badRequest('No email found in flash cache')
          }

          const email = messages[0]
          const model = saveAndExitConfirmationViewModel(
            metadata,
            email,
            status
          )

          return h.view('save-and-exit-confirmation', model)
        },
        options: {
          validate: {
            params: saveAndExitParamsSchema
          }
        }
      })
    }
  }
} satisfies ServerRegisterPluginObject<void>
