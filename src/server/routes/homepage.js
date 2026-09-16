import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import { stateSchema } from '@defra/forms-engine-plugin/schema.js'
import { slugSchema } from '@defra/forms-model'
import Joi from 'joi'

import { config } from '~/src/config/index.js'
import { CITIZEN_SESSION } from '~/src/server/auth/scheme.js'
import {
  FORM_PREFIX,
  HOMEPAGE_PREFIX,
  PREVIEW_PATH_PREFIX
} from '~/src/server/constants.js'
import { formatDateTime } from '~/src/server/helpers/date-helper.js'
import { getFormTranslator } from '~/src/server/routes/save-and-exit.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import { getSavedForms } from '~/src/server/services/submissionService.js'

const authBase = config.get('oidc.issuer')
const runnerBase = config.get('baseUrl')

// Tabs
const FORMS_TAB = 'forms'
const SECURITY_TAB = 'security'

const tabSchema = Joi.string().valid(FORMS_TAB, SECURITY_TAB).default(FORMS_TAB)

/**
 * @typedef { FormParams & { tab?: string, action?: string } } HomepageParams
 */

/**
 * @typedef {object} HomepageViewModel
 * @property {string} tab current tab
 * @property {{ translator: Translator }} context view context
 * @property {unknown} serviceNavigationParams tab and navigation details
 * @property {string} [startUrl] link for starting a form
 * @property {string} [accountLink] link to identity-ui account page
 */

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
 * Construct the tabs
 * @param {{ query: RequestQuery, yar: Yar }} request
 * @param {boolean} isPreview
 * @param {FormStatus} state
 * @param {string} slug
 * @param { string | undefined } tab
 */
async function buildNavigation(
  request,
  isPreview,
  state,
  slug,
  tab = FORMS_TAB
) {
  const form = await getFormMetadata(slug)

  const { translator } = await getFormTranslator(
    request,
    form,
    isPreview ? state : undefined
  )

  const startUrl = isPreview
    ? `${FORM_PREFIX}${PREVIEW_PATH_PREFIX}/${state}/${slug}`
    : `${FORM_PREFIX}/${slug}`

  const homepageBase = isPreview
    ? `${HOMEPAGE_PREFIX}${PREVIEW_PATH_PREFIX}/${state}/${slug}`
    : `${HOMEPAGE_PREFIX}/${slug}`

  const serviceNavigationParams = {
    serviceName: form.title,
    navigation: [
      {
        href: `${homepageBase}/forms`,
        text: 'Forms',
        active: tab === FORMS_TAB
      },
      {
        href: `${homepageBase}/security`,
        text: 'Security',
        active: tab === SECURITY_TAB
      }
    ]
  }

  return {
    serviceNavigationParams,
    startUrl,
    homepageBase,
    translator
  }
}

/**
 * A saved form as the table shows it. The dates are formatted and the status
 * is chosen here rather than in the template, so they can be tested.
 * @param {SavedForm} savedForm
 * @param {string} language - the page language
 */
function mapToRow(savedForm, language) {
  return {
    referenceNumber: savedForm.referenceNumber,
    status: getFormStatus(savedForm),
    lastUpdated: formatDateTime(savedForm.createdAt, language),
    savedUntil: formatDateTime(savedForm.expireAt, language)
  }
}

/**
 * Renders the homepage for the form state the URL names: live for
 * `/homepage/{slug}`, a preview for `/homepage/preview/{state}/{slug}`.
 * @param {Request<{ Params: HomepageParams }>} request
 * @param {ResponseToolkit<{ Params: HomepageParams }>} h
 */
async function homepageHandler(request, h) {
  const { slug, tab } = request.params

  const { isPreview, state } = checkFormStatus(request.params)

  const nav = await buildNavigation(request, isPreview, state, slug, tab)

  const form = await getFormMetadata(slug)

  const { accessToken } = request.auth.credentials
  const savedForms = await getSavedForms(accessToken, form.id)

  return h.view('homepage/overview', {
    serviceNavigationParams: nav.serviceNavigationParams,
    tab,
    startUrl: nav.startUrl,
    accountLink: `${authBase}/account?returnUrl=${runnerBase}${nav.homepageBase}`,
    savedForms: savedForms.map((savedForm) =>
      mapToRow(savedForm, nav.translator.language)
    ),
    context: { translator: nav.translator }
  })
}

export default [
  /**
   * @satisfies {ServerRoute<{ Params: FormParams }>}
   */
  ({
    method: 'GET',
    path: `${HOMEPAGE_PREFIX}/{slug}/{tab?}`,
    handler: homepageHandler,
    options: {
      auth: { mode: 'required', strategy: CITIZEN_SESSION },
      validate: {
        params: Joi.object({ slug: slugSchema, tab: tabSchema }).required()
      }
    }
  }),
  /**
   * @satisfies {ServerRoute<{ Params: FormParams }>}
   */
  ({
    method: 'GET',
    path: `${HOMEPAGE_PREFIX}${PREVIEW_PATH_PREFIX}/{state}/{slug}/{tab?}`,
    handler: homepageHandler,
    options: {
      auth: { mode: 'required', strategy: CITIZEN_SESSION },
      validate: {
        params: Joi.object({
          state: stateSchema,
          slug: slugSchema,
          tab: tabSchema
        }).required()
      }
    }
  })
]

/**
 * @import { FormParams, FormStatus, Translator } from '@defra/forms-engine-plugin/types'
 * @import { SavedForm } from '~/src/server/services/submissionService.js'
 * @import { Request, RequestQuery, ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { Yar } from '@hapi/yar'
 */
