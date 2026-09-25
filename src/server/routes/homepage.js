import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import { stateSchema } from '@defra/forms-engine-plugin/schema.js'
import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import Joi from 'joi'

import { CITIZEN_SESSION } from '~/src/server/auth/scheme.js'
import {
  FORM_PREFIX,
  HOMEPAGE_PREFIX,
  PREVIEW_PATH_PREFIX
} from '~/src/server/constants.js'
import { formatDate, formatDateTime } from '~/src/server/helpers/date-helper.js'
import { getFormTranslator } from '~/src/server/routes/save-and-exit.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import { getSavedForms } from '~/src/server/services/submissionService.js'

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
 * @param {Translator} translator - the translator for the request
 * @param {string} formId
 */
function mapToRow(savedForm, translator, formId) {
  const status = getFormStatus(savedForm)

  return {
    referenceNumber: savedForm.referenceNumber,
    status,
    lastUpdated: formatDateTime(savedForm.createdAt, translator),
    savedUntil: formatDate(savedForm.expireAt, translator),
    // An expired form cannot be resumed, so it gets no link
    resumeUrl:
      status === SavedFormStatus.InProgress
        ? `/resume-form/${formId}/${savedForm.magicLinkId}`
        : undefined
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

  const { translator } = await getFormTranslator(
    request,
    form,
    isPreview ? state : undefined
  )

  const startUrl = isPreview
    ? `${FORM_PREFIX}${PREVIEW_PATH_PREFIX}/${state}/${slug}`
    : `${FORM_PREFIX}/${slug}`

  const { accessToken } = request.auth.credentials

  if (!accessToken) {
    throw Boom.serverUnavailable(
      'Authenticated session credentials do not contain an access token'
    )
  }

  const savedForms = await getSavedForms(accessToken, form.id)

  return h.view('homepage', {
    startUrl,
    savedForms: savedForms.map((savedForm) =>
      mapToRow(savedForm, translator, form.id)
    ),
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
 * @import { FormParams, Translator } from '@defra/forms-engine-plugin/types'
 * @import { SavedForm } from '~/src/server/services/submissionService.js'
 * @import { Request, ResponseToolkit, ServerRoute } from '@hapi/hapi'
 */
