import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import { stateSchema } from '@defra/forms-engine-plugin/schema.js'
import { slugSchema } from '@defra/forms-model'
import Joi from 'joi'

import { config } from '~/src/config/index.js'
import { HOMEPAGE_PREFIX, PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import { formatDate, formatDateTime } from '~/src/server/helpers/date-helper.js'
import { getFormHref } from '~/src/server/helpers/route-helpers.js'
import { sessionNames } from '~/src/server/helpers/session-names.js'
import { CITIZEN_AUTH_ROUTE_OPTIONS } from '~/src/server/routes/auth.js'
import {
  SavedFormStatus,
  getFormStatus
} from '~/src/server/routes/save-and-exit-helper.js'
import { getFormTranslator } from '~/src/server/routes/save-and-exit.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import { getSavedForms } from '~/src/server/services/submissionService.js'

const authBase = config.get('oidc.issuer')
const runnerBase = config.get('baseUrl')

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
 * @typedef { FormParams & { action?: string } } HomepageParams
 */

/**
 * Construct the tabs
 * @param {FormMetadata} form
 * @param {Translator} translator
 * @param {{ isPreview: boolean, state: FormStatus, slug: string }} input
 */
function buildNavigation(form, translator, { isPreview, state, slug }) {
  const { t } = translator
  const startUrl = getFormHref(form, isPreview, state)

  const homepageBase = isPreview
    ? `${HOMEPAGE_PREFIX}${PREVIEW_PATH_PREFIX}/${state}/${slug}`
    : `${HOMEPAGE_PREFIX}/${slug}`

  const securityUrl = new URL('/account', authBase)
  // The account pages check the return address against this client, and
  // send the citizen back here to sign in when their session there has ended
  securityUrl.searchParams.append('client_id', config.get('oidc.clientId'))
  securityUrl.searchParams.append('returnUrl', `${runnerBase}${homepageBase}`)

  const serviceNavigationParams = {
    serviceName: form.title,
    navigation: [
      {
        href: `${homepageBase}/forms`,
        text: t('signIn.homepage.tabForms'),
        active: true
      },
      {
        href: securityUrl.href,
        text: t('signIn.homepage.tabSecurity'),
        active: false
      }
    ]
  }

  return {
    serviceNavigationParams,
    startUrl,
    homepageBase
  }
}

/**
 * Renders the homepage for the form state the URL names: live for
 * `/homepage/{slug}`, a preview for `/homepage/preview/{state}/{slug}`.
 * @param {Request<{ Params: HomepageParams }>} request
 * @param {ResponseToolkit<{ Params: HomepageParams }>} h
 */
async function homepageHandler(request, h) {
  const { yar, params } = request
  const { slug } = params
  const { isPreview, state } = checkFormStatus(request.params)

  const previewStatus = isPreview ? state : undefined

  const form = await getFormMetadata(slug)

  const { translator } = await getFormTranslator(request, form, previewStatus)

  const nav = buildNavigation(form, translator, { isPreview, state, slug })

  const { accessToken } = request.auth.credentials

  const savedForms = await getSavedForms(accessToken, form.id, previewStatus)

  // Notification banner
  const notification = /** @type {string[] | undefined} */ (
    yar.flash(sessionNames.successNotification).at(0)
  )

  return h.view('homepage', {
    notification,
    serviceNavigationParams: nav.serviceNavigationParams,
    startUrl: nav.startUrl,
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
        params: Joi.object({
          state: stateSchema,
          slug: slugSchema
        }).required()
      }
    }
  })
]

/**
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { FormParams, FormStatus, Translator } from '@defra/forms-engine-plugin/types'
 * @import { SavedForm } from '~/src/server/services/submissionService.js'
 * @import { Request, ResponseToolkit, ServerRoute } from '@hapi/hapi'
 */
