import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import {
  ComponentType,
  ControllerPath,
  hasFormComponents
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import Joi from 'joi'

import { CITIZEN_AUTH_ROUTE_OPTIONS } from '~/src/server/auth/route-options.js'
import {
  SESSION_ACTION,
  SESSION_ACTION_REFERENCE_NUMBER,
  SessionActions
} from '~/src/server/constants.js'
import { formatDateTime } from '~/src/server/helpers/date-helper.js'
import {
  constructHomepageLink,
  getFormHref
} from '~/src/server/helpers/route-helpers.js'
import { t } from '~/src/server/i18n/index.js'
import { getFormTranslator } from '~/src/server/routes/save-and-exit.js'
import {
  getFormDefinition,
  getFormMetadataById
} from '~/src/server/services/formsService.js'
import { getSubmissionRecord } from '~/src/server/services/submissionService.js'
import { mapValueToState } from '~/src/server/utils/map-submission-to-state.js'
import { getAllLanguages } from '~/src/server/utils/utils.js'

export const CONFIRM_COPY_NAME = 'confirmCopy'

const copyFormParamsSchema = Joi.object({
  formId: Joi.string().required(),
  referenceNumber: Joi.string().required()
}).required()

const copyFormPayloadSchema = Joi.object()
  .keys({
    [CONFIRM_COPY_NAME]: Joi.boolean().required()
  })
  .required()

/**
 * @param {Awaited<ReturnType<typeof getFormTranslator>>['translator']} translator
 */
const getTranslatorContext = (translator) => ({
  translator: {
    ...translator,
    languages: getAllLanguages()
  }
})

/**
 * The preview status of the submission, or undefined if a non-preview form (i.e. live)
 * @param {FormSubmissionDocument} submission - the submission document to copy
 * @returns {FormStatus | undefined}
 */
function getPreviewStatus(submission) {
  // The preview status of the form, or undefined if a non-preview form (i.e. live)
  const previewStatus = submission.meta.isPreview
    ? submission.meta.status
    : undefined

  return previewStatus
}

/**
 * Get the form translator for a submission
 * @param {{ query: RequestQuery, yar: Yar }} request - the request
 * @param {FormMetadata} metadata - the metadata of the form
 * @param {FormSubmissionDocument} submission - the submission document to copy
 * @returns {Promise<{ translator: Translator, language: string }>}
 */
async function getTranslator(request, metadata, submission) {
  const previewStatus = getPreviewStatus(submission)

  return getFormTranslator(request, metadata, previewStatus, true)
}

/**
 * @param {CopyFormParams} params
 * @param {string} accessToken
 * @returns {Promise<FormAndSubmission>}
 */
async function getFormAndSubmission(params, accessToken) {
  const { formId, referenceNumber } = params
  const form = await getFormMetadataById(formId)
  const submissionToCopy = await getSubmissionRecord(
    referenceNumber,
    accessToken
  )

  if (!submissionToCopy) {
    throw Boom.notFound(
      `Cannot copy form '${referenceNumber}' because it was not found`
    )
  }

  return { form, referenceNumber, submissionToCopy }
}

const getRouteOptions = {
  auth: CITIZEN_AUTH_ROUTE_OPTIONS,
  validate: {
    params: copyFormParamsSchema
  }
}

export default [
  /**
   * @satisfies {ServerRoute<{ Params: CopyFormParams }>}
   */
  ({
    method: 'GET',
    path: '/confirm-copy-form/{formId}/{referenceNumber}',
    handler: async (request, h) => {
      const { auth, params } = request
      const { accessToken } = auth.credentials
      const { form, referenceNumber, submissionToCopy } =
        await getFormAndSubmission(params, accessToken)

      const { translator } = await getTranslator(
        request,
        form,
        submissionToCopy
      )

      const previewStatus = getPreviewStatus(submissionToCopy)
      const backLinkHref = constructHomepageLink(form.slug, previewStatus)
      const model = copyFormViewModel(
        'confirmCopyForm.title',
        backLinkHref,
        form,
        referenceNumber,
        submissionToCopy,
        translator
      )

      return h.view('copy-form/confirm-copy-form', model)
    },
    options: getRouteOptions
  }),

  /**
   * @satisfies {ServerRoute<{ Params: CopyFormParams }>}
   */
  ({
    method: 'POST',
    path: '/confirm-copy-form/{formId}/{referenceNumber}',
    handler: async (request, h) => {
      const { auth, params } = request
      const { accessToken } = auth.credentials
      const { form, referenceNumber, submissionToCopy } =
        await getFormAndSubmission(params, accessToken)

      const def = await getFormDefinitionForSubmission(
        submissionToCopy,
        form,
        referenceNumber
      )
      const { formDeclarations, formVersionHasChanged } = getFormDetails(
        def,
        submissionToCopy
      )

      if (formDeclarations.length > 0 || formVersionHasChanged) {
        return h
          .redirect(
            `/confirm-copy-form/${form.id}/${referenceNumber}/form-changed`
          )
          .takeover()
      }

      await setCacheState(request, submissionToCopy, form)

      const formHref = getFormHref(
        form.slug,
        submissionToCopy.meta.isPreview,
        submissionToCopy.meta.status
      )
      const formSummaryPath = `${formHref}${ControllerPath.Summary}`

      return h.redirect(formSummaryPath)
    },
    options: {
      auth: CITIZEN_AUTH_ROUTE_OPTIONS,
      validate: {
        params: copyFormParamsSchema,
        payload: copyFormPayloadSchema
      }
    }
  }),

  /**
   * @satisfies {ServerRoute<{ Params: CopyFormParams }>}
   */
  ({
    method: 'GET',
    path: '/confirm-copy-form/{formId}/{referenceNumber}/form-changed',
    handler: async (request, h) => {
      const { auth, params } = request
      const { accessToken } = auth.credentials
      const { form, referenceNumber, submissionToCopy } =
        await getFormAndSubmission(params, accessToken)

      const { translator } = await getTranslator(
        request,
        form,
        submissionToCopy
      )

      const model = copyFormViewModel(
        'confirmCopyFormChanged.title',
        `/confirm-copy-form/${form.id}/${referenceNumber}`,
        form,
        referenceNumber,
        submissionToCopy,
        translator
      )

      return h.view('copy-form/confirm-copy-form-changed', model)
    },
    options: getRouteOptions
  }),

  /**
   * @satisfies {ServerRoute<{ Params: CopyFormParams }>}
   */
  ({
    method: 'GET',
    path: '/confirm-copy-form/{formId}/{referenceNumber}/check-answers',
    handler: async (request, h) => {
      const { auth, params } = request
      const { accessToken } = auth.credentials
      const { form, referenceNumber, submissionToCopy } =
        await getFormAndSubmission(params, accessToken)

      const { translator } = await getTranslator(
        request,
        form,
        submissionToCopy
      )

      const model = copyFormViewModel(
        'confirmCopyCheckAnswers.title',
        `/confirm-copy-form/${form.id}/${referenceNumber}/form-changed`,
        form,
        referenceNumber,
        submissionToCopy,
        translator
      )

      return h.view('copy-form/confirm-copy-check-answers', model)
    },
    options: getRouteOptions
  }),

  /**
   * @satisfies {ServerRoute<{ Params: CopyFormParams }>}
   */
  ({
    method: 'POST',
    path: '/confirm-copy-form/{formId}/{referenceNumber}/check-answers',
    handler: async (request, h) => {
      const { auth, params } = request
      const { accessToken } = auth.credentials
      const { form, referenceNumber, submissionToCopy } =
        await getFormAndSubmission(params, accessToken)

      const def = await getFormDefinitionForSubmission(
        submissionToCopy,
        form,
        referenceNumber
      )
      const { formDeclarations, formVersionHasChanged } = getFormDetails(
        def,
        submissionToCopy
      )
      const ignoreKeys = formDeclarations.map((declaration) => declaration.name)

      // Set state and dispatch user into the form
      await setCacheState(request, submissionToCopy, form, ignoreKeys)

      // If the form version has changed, redirect to the form start page and walkthrough,
      // otherwise redirect to the summary page and allow the engine to handle the walkthrough
      const formHref = getFormHref(
        form.slug,
        submissionToCopy.meta.isPreview,
        submissionToCopy.meta.status
      )
      const nextHref =
        formVersionHasChanged || formDeclarations.length > 0
          ? formHref
          : `${formHref}${ControllerPath.Summary}`

      return h.redirect(nextHref)
    },
    options: {
      auth: CITIZEN_AUTH_ROUTE_OPTIONS,
      validate: {
        params: copyFormParamsSchema,
        payload: copyFormPayloadSchema
      }
    }
  })
]

/**
 * @param {string} pageTitleKey - the page title key for translation
 * @param {string} backLinkHref - the back link href
 * @param {FormMetadata} form - the form metadata
 * @param {string} referenceNumber - the submission reference number
 * @param {FormSubmissionDocument} submission - the submission to copy
 * @param {FormTranslator} translator - the form translator
 * @returns {CopyFormViewModel}
 */
function copyFormViewModel(
  pageTitleKey,
  backLinkHref,
  form,
  referenceNumber,
  submission,
  translator
) {
  const pageTitle = t(pageTitleKey, translator.language)
  const backLink = {
    text: t('common.back', translator.language),
    href: backLinkHref
  }
  const submittedAt = getSubmittedAtDate(submission, translator)

  return {
    pageTitle,
    backLink,
    form,
    referenceNumber,
    submittedAt,
    context: getTranslatorContext(translator)
  }
}

/**
 * @param {FormSubmissionDocument} submission - the submission document
 * @param {FormTranslator} translator - the form translator
 * @returns {string}
 */
function getSubmittedAtDate(submission, translator) {
  return formatDateTime(submission.meta.timestamp.toString(), translator)
}

/**
 * Get the form definition associated with a submission
 * @param {FormSubmissionDocument} submission
 * @param {FormMetadata} form
 * @param {string} referenceNumber
 * @returns {Promise<FormDefinition>}
 */
async function getFormDefinitionForSubmission(
  submission,
  form,
  referenceNumber
) {
  const { status } = submission.meta
  const def = await getFormDefinition(form.id, status)

  if (!def) {
    throw Boom.notFound(
      `Cannot copy form '${referenceNumber}' because the form definition (${status}) was not found`
    )
  }

  return def
}

/**
 * Get diff details about the form definition and submission
 * @param {FormDefinition} def
 * @param {FormSubmissionDocument} submission
 * @returns {{ formDeclarations: DeclarationFieldComponent[], formVersionHasChanged: boolean }}
 */
function getFormDetails(def, submission) {
  const formDeclarations = def.pages
    .flatMap((p) => (hasFormComponents(p) ? p.components : []))
    .filter((c) => c.type === ComponentType.DeclarationField)

  const latestVersionMetadata = /** @type {FormVersionMetadata | undefined} */ (
    def.metadata?.$$__formVersion
  )

  const { versionMetadata } = submission.meta

  const formVersionHasChanged =
    latestVersionMetadata && versionMetadata
      ? latestVersionMetadata.versionNumber > versionMetadata.versionNumber
      : true // If either version metadata is missing, assume the form has changed

  return { formDeclarations, formVersionHasChanged }
}

/**
 * Set the cache state with the copied submission
 * @param {Request<{ Params: CopyFormParams }>} request
 * @param {FormSubmissionDocument} submissionToCopy
 * @param {FormMetadata} form
 * @param {string[]} [ignoreKeys] - keys to ignore when copying state (e.g. declaration fields)
 */
async function setCacheState(request, submissionToCopy, form, ignoreKeys = []) {
  const cacheService = getCacheService(request.server)
  const copiedState = mapValueToState(submissionToCopy, ignoreKeys)
  const state = getPreviewStatus(submissionToCopy)
  const req = { yar: request.yar, params: { slug: form.slug, state } }

  await cacheService.clearState(req)
  await cacheService.setState(req, {
    ...copiedState,
    [SESSION_ACTION]: SessionActions.Copy,
    [SESSION_ACTION_REFERENCE_NUMBER]: submissionToCopy.meta.referenceNumber,
    $$__referenceNumber: undefined
  })
}

/**
 * @typedef {object} FormAndSubmission
 * @property {FormMetadata} form - the form metadata
 * @property {string} referenceNumber - the submission reference number
 * @property {FormSubmissionDocument} submissionToCopy - the submission document to copy
 */

/**
 * @typedef {{ formId: string, referenceNumber: string }} CopyFormParams
 */

/**
 * @typedef {object} CopyFormBackLink
 * @property {string} text - the link text
 * @property {string} href - the link href
 */

/**
 * @typedef {object} CopyFormViewModel
 * @property {string} pageTitle - the page title
 * @property {CopyFormBackLink} backLink - the back link
 * @property {FormMetadata} form - the form metadata
 * @property {string} referenceNumber - the submission reference number
 * @property {string} submittedAt - the submission date and time
 * @property {{ translator: FormTranslator & { languages: ReturnType<typeof getAllLanguages> } }} context - the translator context
 */

/** @typedef {Awaited<ReturnType<typeof getFormTranslator>>['translator']} FormTranslator */

/**
 * @import { ServerRoute, Request, RequestQuery } from '@hapi/hapi'
 * @import { Yar } from '@hapi/yar'
 * @import { FormVersionMetadata, FormMetadata, FormDefinition, FormStatus, DeclarationFieldComponent } from '@defra/forms-model'
 * @import { Translator } from '@defra/forms-engine-plugin/engine/i18n/types.js'
 * @import { FormSubmissionDocument } from '~/src/server/services/submissionService.js'
 */
