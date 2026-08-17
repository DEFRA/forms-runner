import { slugSchema } from '@defra/forms-model'
import Joi from 'joi'

import {
  FORM_PREFIX,
  HOMEPAGE_PREFIX,
  SIGN_IN_PATH
} from '~/src/server/constants.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'

/**
 * @type {ServerRoute[]}
 */
export default [
  {
    method: 'GET',
    path: `${HOMEPAGE_PREFIX}/{slug}`,
    async handler(request, h) {
      const { slug } = request.params

      // Resolve the form before the sign-in gate, so an unknown slug answers
      // straight away with the 404 the error pages plugin renders for it.
      const form = await getFormMetadata(slug)

      if (!request.auth.isAuthenticated) {
        const returnTo = encodeURIComponent(`${HOMEPAGE_PREFIX}/${slug}`)
        return h.redirect(`${SIGN_IN_PATH}?returnTo=${returnTo}`)
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
