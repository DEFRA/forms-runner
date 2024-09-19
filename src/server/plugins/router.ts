import Boom from '@hapi/boom'
import { type ServerRegisterPluginObject } from '@hapi/hapi'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import {
  healthRoute,
  publicRoutes,
  fileUploadRoute
} from '~/src/server/routes/index.js'

const routes = [...publicRoutes, healthRoute, fileUploadRoute]

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
