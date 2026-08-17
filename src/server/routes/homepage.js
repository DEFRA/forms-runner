import { slugSchema } from '@defra/forms-model'
import Joi from 'joi'

import { FORM_PREFIX, HOMEPAGE_PREFIX } from '~/src/server/constants.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import { signInUrl } from '~/src/server/utils/utils.js'

/**
 * @type {ServerRoute[]}
 */
export default [
  {
    method: 'GET',
    path: `${HOMEPAGE_PREFIX}/{slug}`,
    async handler(request, h) {
      const { slug } = request.params

      // Look up the form before the sign-in check, so an unknown slug gets a
      // 404 instead of a trip through sign in.
      const form = await getFormMetadata(slug)

      if (!request.auth.isAuthenticated) {
        return h.redirect(signInUrl(`${HOMEPAGE_PREFIX}/${slug}`))
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
