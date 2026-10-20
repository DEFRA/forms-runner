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

  if (savedForm.isProcessing) {
    return {
      referenceNumber: savedForm.referenceNumber,
      status,
      lastUpdated: '',
      savedUntil: ''
    }
  }

  return {
    referenceNumber: savedForm.referenceNumber,
    status,
    lastUpdated: formatDateTime(savedForm.createdAt, translator),
    savedUntil:
      status === SavedFormStatus.Deleted
        ? ''
        : formatDate(savedForm.expireAt, translator),
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
  // The account pages show `returnUrl` as their "Back" link and check it
  // against `client_id`. They also send the citizen back here to sign in
  // when their session there has ended.
  securityUrl.searchParams.append('client_id', config.get('oidc.clientId'))
  securityUrl.searchParams.append('returnUrl', `${runnerBase}${homepageBase}`)

  const serviceNavigationParams = {
    serviceName: form.title,
    navigation: [
      {
        href: homepageBase,
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
 * Handles Save-and-exit forms or submitted forms that have been 'saved/submitted' by the user
 * but not yet been processed in the queue, and therefore don't yet exist in 'saved forms'.
 * Their reference numbers are added to the session at point of save/submission, and then
 * checked here to see if they are not yet showing as 'saved forms'.
 * @param {Request<{ Params: HomepageParams }>} request
 * @param {SavedForm[]} savedForms
 */
export function addInFlightForms(request, savedForms) {
  const savedFormRefs = new Set(savedForms.map((form) => form.referenceNumber))
  const allForms = structuredClone(savedForms)
  const inFlightFormRefs = /** @type { string[] | undefined } */ (
    request.yar.get(sessionNames.inFlightForms)
  )
  let processingCount = 0
  if (inFlightFormRefs) {
    inFlightFormRefs.forEach((formRef) => {
      if (!savedFormRefs.has(formRef)) {
        // @ts-expect-error - partial data row as 'is processing'
        allForms.push({ referenceNumber: formRef, isProcessing: true })
        processingCount++
      }
    })
    if (processingCount === 0) {
      request.yar.clear(sessionNames.inFlightForms)
    }
  }
  return allForms
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

  const savedAndInFlightForms = addInFlightForms(request, savedForms).sort(
    formTableSorter
  )

  // Notification banner
  const notification = /** @type {string[] | undefined} */ (
    yar.flash(sessionNames.successNotification).at(0)
  )

  return h.view('homepage', {
    notification,
    serviceNavigationParams: nav.serviceNavigationParams,
    startUrl: nav.startUrl,
    savedForms: savedAndInFlightForms.map((savedForm) =>
      mapToRow(savedForm, translator, form.id)
    ),
    context: { translator }
  })
}

/**
 * Sort the rows by status (alphabetically descending), then by 'updatedAt' ascending
 * @param {SavedForm} a
 * @param {SavedForm} b
 */
export function formTableSorter(a, b) {
  const statusA = getFormStatus(a)
  const statusB = getFormStatus(b)

  return (
    statusB.localeCompare(statusA) || b.createdAt.localeCompare(a.createdAt)
  )
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
