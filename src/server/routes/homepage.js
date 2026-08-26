import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import { stateSchema } from '@defra/forms-engine-plugin/schema.js'
import { slugSchema } from '@defra/forms-model'
import Joi from 'joi'

import { CITIZEN_SESSION } from '~/src/server/auth/scheme.js'
import {
  FORM_PREFIX,
  HOMEPAGE_PREFIX,
  PREVIEW_PATH_PREFIX
} from '~/src/server/constants.js'
import { getFormTranslator } from '~/src/server/routes/save-and-exit.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'

/**
 * Renders the homepage for the form state the URL names: live for
 * `/homepage/{slug}`, a preview for `/homepage/preview/{state}/{slug}`.
 * @param {Request<{ Params: FormParams }>} request
 * @param {ResponseToolkit<{ Params: FormParams }>} h
 */
async function homepageHandler(request, h) {
  const { slug } = request.params
  const { isPreview, state } = checkFormStatus(request.params)

  const form = await getFormMetadata(slug)

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
      auth: { mode: 'required', strategy: CITIZEN_SESSION },
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
      auth: { mode: 'required', strategy: CITIZEN_SESSION },
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
