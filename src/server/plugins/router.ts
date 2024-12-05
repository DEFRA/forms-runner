import Boom from '@hapi/boom'
import { type ServerRegisterPluginObject } from '@hapi/hapi'

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

      server.route<{ Payload: { 'cookies[additional]': string } }>({
        method: 'post',
        path: '/help/cookie-preferences',
        handler(request, h) {
          const decision = request.payload['cookies[additional]']

          if (decision === 'yes') {
            request.yar.set('cookieConsent', true)
          } else {
            request.yar.set('cookieConsent', false)
          }

          request.yar.flash('cookieConsentUpdated', true)

          return h.redirect(request.info.referrer)
        }
      })

      server.route({
        method: 'get',
        path: '/help/cookie-preferences',
        handler(request, h) {
          const cookieConsentUpdated =
            request.yar.flash('cookieConsentUpdated').at(0) ?? false
          const cookieConsent = request.yar.get('cookieConsent') ?? false

          return h.view('help/cookie-preferences', {
            cookieConsent,
            cookieConsentUpdated
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
