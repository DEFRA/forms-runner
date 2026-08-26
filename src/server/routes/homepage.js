import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import { stateSchema } from '@defra/forms-engine-plugin/schema.js'
import { slugSchema } from '@defra/forms-model'
import Joi from 'joi'

import {
  FORM_PREFIX,
  HOMEPAGE_PREFIX,
  PREVIEW_PATH_PREFIX
} from '~/src/server/constants.js'
import { getFormTranslator } from '~/src/server/routes/save-and-exit.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import { signInUrl } from '~/src/server/utils/utils.js'

/**
 * Renders the homepage for the form state the URL names: live for
 * `/homepage/{slug}`, a preview for `/homepage/preview/{state}/{slug}`.
 * @param {Request<{ Params: FormParams }>} request
 * @param {ResponseToolkit<{ Params: FormParams }>} h
 */
async function homepageHandler(request, h) {
  const { slug } = request.params
  const { isPreview, state } = checkFormStatus(request.params)

  // Look up the form before the sign-in check, so an unknown slug gets a
  // 404 instead of a trip through sign in.
  const form = await getFormMetadata(slug)

  // The auth strategy runs in `try` mode, so the handler redirects to sign
  // in and keeps the current path as the return path.
  if (!request.auth.isAuthenticated) {
    return h.redirect(signInUrl(request.path))
  }

  // A preview names its state in the URL. The live homepage leaves the
  // status to the translator's own fallback, which serves forms that have
  // no live version yet.
  const { translator } = await getFormTranslator(
    request,
    form,
    isPreview ? state : undefined
  )

  const startUrl = isPreview
    ? `${FORM_PREFIX}${PREVIEW_PATH_PREFIX}/${state}/${slug}`
    : `${FORM_PREFIX}/${slug}`

  return h.view('homepage', {
    startUrl,
    context: { translator }
  })
}

export default [
  /**
   * @satisfies {ServerRoute<{ Params: FormParams }>}
   */
  ({
    method: 'GET',
    path: `${HOMEPAGE_PREFIX}/{slug}`,
    handler: homepageHandler,
    options: {
      validate: {
        params: Joi.object({ slug: slugSchema }).required()
      }
    }
  }),
  /**
   * @satisfies {ServerRoute<{ Params: FormParams }>}
   */
  ({
    method: 'GET',
    path: `${HOMEPAGE_PREFIX}${PREVIEW_PATH_PREFIX}/{state}/{slug}`,
    handler: homepageHandler,
    options: {
      validate: {
        params: Joi.object({ state: stateSchema, slug: slugSchema }).required()
      }
    }
  })
]

/**
 * @import { FormParams } from '@defra/forms-engine-plugin/types'
 * @import { Request, ResponseToolkit, ServerRoute } from '@hapi/hapi'
 */
