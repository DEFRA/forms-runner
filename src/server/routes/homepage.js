import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import { stateSchema } from '@defra/forms-engine-plugin/schema.js'
import { slugSchema } from '@defra/forms-model'
import Joi from 'joi'

import {
  FORM_PREFIX,
  HOMEPAGE_PREFIX,
  PREVIEW_PATH_PREFIX
} from '~/src/server/constants.js'
import { formatDate, formatDateTime } from '~/src/server/helpers/date-helper.js'
import { sessionNames } from '~/src/server/helpers/session-names.js'
import { CITIZEN_AUTH_ROUTE_OPTIONS } from '~/src/server/routes/auth.js'
import {
  SavedFormStatus,
  getFormStatus
} from '~/src/server/routes/save-and-exit-helper.js'
import { getFormTranslator } from '~/src/server/routes/save-and-exit.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import { getSavedForms } from '~/src/server/services/submissionService.js'

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
        : undefined,
    // An expired form cannot be deleted, so it gets no link
    deleteUrl:
      status === SavedFormStatus.InProgress
        ? `/delete-form/${formId}/${savedForm.magicLinkId}`
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
  const { yar, params } = request
  const { slug } = params
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
  const savedForms = await getSavedForms(accessToken, form.id)

  // Notification banner
  const notification = /** @type {string[] | undefined} */ (
    yar.flash(sessionNames.successNotification).at(0)
  )

  return h.view('homepage', {
    notification,
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
      auth: CITIZEN_AUTH_ROUTE_OPTIONS,
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
      auth: CITIZEN_AUTH_ROUTE_OPTIONS,
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
