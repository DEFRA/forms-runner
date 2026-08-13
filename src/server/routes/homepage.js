import { slugSchema } from '@defra/forms-model'
import Joi from 'joi'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { getFormMetadataWithoutGuard } from '~/src/server/services/formMetadataGuards.js'

/**
 * @type {ServerRoute[]}
 */
export default [
  {
    method: 'GET',
    path: '/homepage/{slug}',
    async handler(request, h) {
      const { slug } = request.params

      // Resolve the form before the sign-in gate, so an unknown slug answers
      // 404 rather than sending a citizen through sign in to reach a page
      // that is not there. The error pages plugin renders the thrown 404.
      const form = await getFormMetadataWithoutGuard(slug)

      if (!request.auth.isAuthenticated) {
        const returnTo = encodeURIComponent(`/homepage/${slug}`)
        return h.redirect(`/login?returnTo=${returnTo}`)
      }

      return h.view('homepage', {
        form,
        startUrl: `${FORM_PREFIX}/${slug}`
      })
    },
    options: {
      validate: {
        params: Joi.object({ slug: slugSchema }).required()
      }
    }
  }
]

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
