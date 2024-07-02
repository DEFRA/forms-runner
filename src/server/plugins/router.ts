import Boom from '@hapi/boom'
import { type Request, type ResponseToolkit } from '@hapi/hapi'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import { healthRoute, publicRoutes } from '~/src/server/routes/index.js'

const routes = [...publicRoutes, healthRoute]

const logger = createLogger()

const privacyPolicies: Record<string, string> = {
  'register-a-boat-at-rye-harbour':
    'https://www.gov.uk/government/publications/rye-harbour-privacy-notice',
  'apply-for-an-annual-mooring-at-rye-harbour':
    'https://www.gov.uk/government/publications/rye-harbour-privacy-notice',
  'request-a-form':
    'https://defra.sharepoint.com/sites/Community4442/SitePages/Privacy-notice--Defra-Forms.aspx',
  'register-as-a-unicorn-breeder':
    'https://defra.sharepoint.com/sites/Community4442/SitePages/Privacy-notice--Defra-Forms.aspx'
}

export default {
  plugin: {
    name: 'router',
    register: (server) => {
      server.route(routes)
      server.route([
        {
          method: 'get',
          path: '/help/get-support/{slug?}',
          async handler(
            request: Request<{ Params: { slug?: string } }>,
            h: ResponseToolkit
          ) {
            const { slug } = request.params
            const viewName = 'help/get-support'

            // If there's no slug in the path,
            // return the generic help page
            if (!slug) {
              return h.view(viewName)
            }

            const form = await getFormMetadata(slug)

            return h.view(viewName, { slug, name: form.title })
          }
        },
        {
          method: 'get',
          path: '/help/privacy/{slug}',
          handler(
            request: Request<{ Params: { slug: string } }>,
            h: ResponseToolkit
          ) {
            const { slug } = request.params

            const privacyPolicy = privacyPolicies[slug]

            if (!privacyPolicy) {
              logger.error(`Privacy policy not found for slug ${slug}`)
              return Boom.notFound()
            }

            return h.redirect(privacyPolicy)
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
    }
  }
}
