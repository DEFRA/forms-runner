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
import { formatDateTime } from '~/src/server/helpers/date-helper.js'
import { getFormTranslator } from '~/src/server/routes/save-and-exit.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import { getSaveAndExitDetails, getSavedForms } from '~/src/server/services/submissionService.js'

/**
 * The status of a saved form. Each value is also the translation key of the
 * tag the table shows for it.
 */
const SavedFormStatus = {
  InProgress: 'inProgress',
  Expired: 'expired'
}

/**
 * Returns the status for a saved form.
 * @param {SavedForm} savedForm
 */
function getFormStatus(savedForm) {
  if (new Date(savedForm.expireAt) <= new Date()) {
    return SavedFormStatus.Expired
  }

  return SavedFormStatus.InProgress
}

/**
 * A saved form as the table shows it. The dates are formatted and the status
 * is chosen here rather than in the template, so they can be tested.
 * @param {SavedForm} savedForm
 * @param {string} language - the page language
 * @param {string} homepageBaseUrl - the homepage base url
 */
function mapToRow(savedForm, language, homepageBaseUrl) {
  return {
    referenceNumber: savedForm.referenceNumber,
    status: getFormStatus(savedForm),
    lastUpdated: formatDateTime(savedForm.createdAt, language),
    savedUntil: formatDateTime(savedForm.expireAt, language),
    actions: {
      continue: '#',
      delete: `${homepageBaseUrl}/delete/${savedForm.magicLinkId}`
    }
  }
}

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

  const { translator, language } = await getFormTranslator(
    request,
    form,
    isPreview ? state : undefined
  )

  const startUrl = isPreview
    ? `${FORM_PREFIX}${PREVIEW_PATH_PREFIX}/${state}/${slug}`
    : `${FORM_PREFIX}/${slug}`
  const homepageUrl = isPreview
    ? `${HOMEPAGE_PREFIX}/${slug}/${state}`
    : `${HOMEPAGE_PREFIX}/${slug}`


  const { accessToken } = request.auth.credentials
  const savedForms = await getSavedForms(accessToken, form.id)

  return h.view('homepage', {
    startUrl,
    savedForms: savedForms.map((savedForm) => mapToRow(savedForm, language, homepageUrl)),
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
  }),
  /**
   * @satisfies {ServerRoute<{ Params: FormParams & { id: string } }>}
   */
  ({
    method: 'GET',
    path: `${HOMEPAGE_PREFIX}/{slug}/delete/{id}/{state?}`,
    handler: async (request, h) => {
      const { slug, id } = request.params
      const { isPreview, state } = checkFormStatus(request.params)

      const form = await getFormMetadata(slug)

      const { translator, language } = await getFormTranslator(
        request,
        form,
        isPreview ? state : undefined
      )

      const startUrl = isPreview
        ? `${FORM_PREFIX}/${slug}/${state}`
        : `${FORM_PREFIX}/${slug}`

      const { accessToken } = request.auth.credentials
      const savedForm = await getSaveAndExitDetails(id)

      return h.view('delete', {
        startUrl,
        context: { translator }
      })
    },
    options: {
      auth: { mode: 'required', strategy: CITIZEN_SESSION },
      validate: {
        params: Joi.object({ slug: slugSchema, id: Joi.string().required(), state: stateSchema.optional() }).required()
      }
    }
  })
]

/**
 * @import { FormParams } from '@defra/forms-engine-plugin/types'
 * @import { SavedForm } from '~/src/server/services/submissionService.js'
 * @import { Request, ResponseToolkit, ServerRoute } from '@hapi/hapi'
 */
