import { slugSchema } from '@defra/forms-model'
import Joi from 'joi'

import { FORM_PREFIX, HOMEPAGE_PREFIX } from '~/src/server/constants.js'
import { getFormTranslator } from '~/src/server/routes/save-and-exit.js'
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

      // The form name comes from the form definition, so it is translated
      // with the form's translator.
      const { translator } = await getFormTranslator(request, form)

      return h.view('homepage', {
        startUrl: `${FORM_PREFIX}/${slug}`,
        context: { translator }
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
