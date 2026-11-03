import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import {
  ComponentType,
  ControllerPath,
  hasFormComponents
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import Joi from 'joi'

import { CITIZEN_AUTH_ROUTE_OPTIONS } from '~/src/server/auth/route-options.js'
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

export default [
  /**
   * @satisfies {ServerRoute<{ Params: CopyFormParams }>}
   */
  ({
    method: 'GET',
    path: '/confirm-copy-form/{formId}/{referenceNumber}',
    handler: async (request, h) => {
      const { auth, params } = request
      const { formId, referenceNumber } = params
      const { accessToken } = auth.credentials

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

      const previewStatus = submissionToCopy.meta.isPreview
        ? submissionToCopy.meta.status
        : undefined

      const { translator, language } = await getFormTranslator(
        request,
        form,
        previewStatus,
        true
      )

      const pageHeading = t('confirmCopyForm.title', language)
      const pageTitle = pageHeading
      const status = submissionToCopy.meta.isPreview
        ? submissionToCopy.meta.status
        : undefined
      const backLink = {
        text: t('common.back', language),
        href: constructHomepageLink(form.slug, status)
      }
      const submittedAt = formatDateTime(
        submissionToCopy.meta.timestamp.toString(),
        translator
      )

      return h.view('copy-form/confirm-copy-form', {
        pageTitle,
        backLink,
        form,
        referenceNumber,
        submittedAt,
        context: {
          translator: {
            ...translator,
            languages: getAllLanguages()
          }
        }
      })
    },
    options: {
      auth: CITIZEN_AUTH_ROUTE_OPTIONS,
      validate: {
        params: Joi.object({
          formId: Joi.string().required(),
          referenceNumber: Joi.string().required()
        }).required()
      }
    }
  }),

  /**
   * @satisfies {ServerRoute<{ Params: CopyFormParams }>}
   */
  ({
    method: 'POST',
    path: '/confirm-copy-form/{formId}/{referenceNumber}',
    handler: async (request, h) => {
      const { auth, params } = request
      const { formId, referenceNumber } = params
      const { accessToken } = auth.credentials

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

      const def = await getFormDefinitionForSubmission(
        submissionToCopy,
        form,
        referenceNumber
      )
      const { formHasDeclaration, formVersionHasChanged } = getFormDetails(
        def,
        submissionToCopy
      )

      if (formHasDeclaration || formVersionHasChanged) {
        return h
          .redirect(
            `/confirm-copy-form/${form.id}/${referenceNumber}/form-changed`
          )
          .takeover()
      }

      // Set state and dispatch user into the form
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
        params: Joi.object({
          formId: Joi.string().required(),
          referenceNumber: Joi.string().required()
        }).required(),
        payload: Joi.object()
          .keys({
            [CONFIRM_COPY_NAME]: Joi.boolean().required()
          })
          .required()
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
      const { formId, referenceNumber } = params
      const { accessToken } = auth.credentials

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

      const previewStatus = submissionToCopy.meta.isPreview
        ? submissionToCopy.meta.status
        : undefined

      const { translator, language } = await getFormTranslator(
        request,
        form,
        previewStatus,
        true
      )

      const pageHeading = t('confirmCopyFormChanged.title', language)
      const pageTitle = pageHeading
      const backLink = {
        text: t('common.back', language),
        href: `/confirm-copy-form/${formId}/${referenceNumber}`
      }
      const submittedAt = formatDateTime(
        submissionToCopy.meta.timestamp.toString(),
        translator
      )

      return h.view('copy-form/confirm-copy-form-changed', {
        pageTitle,
        backLink,
        form,
        referenceNumber,
        submittedAt,
        context: {
          translator: {
            ...translator,
            languages: getAllLanguages()
          }
        }
      })
    },
    options: {
      auth: CITIZEN_AUTH_ROUTE_OPTIONS,
      validate: {
        params: Joi.object({
          formId: Joi.string().required(),
          referenceNumber: Joi.string().required()
        }).required()
      }
    }
  }),

  /**
   * @satisfies {ServerRoute<{ Params: CopyFormParams }>}
   */
  ({
    method: 'POST',
    path: '/confirm-copy-form/{formId}/{referenceNumber}/form-changed',
    handler: async (request, h) => {
      const { auth, params } = request
      const { formId, referenceNumber } = params
      const { accessToken } = auth.credentials

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

      const def = await getFormDefinitionForSubmission(
        submissionToCopy,
        form,
        referenceNumber
      )
      const { formVersionHasChanged } = getFormDetails(def, submissionToCopy)

      // Set state and dispatch user into the form
      await setCacheState(request, submissionToCopy, form)

      // If the form version has changed, redirect to the form start page and walkthrough,
      // otherwise redirect to the summary page and allow the engine to handle the walkthrough
      const formHref = getFormHref(
        form.slug,
        submissionToCopy.meta.isPreview,
        submissionToCopy.meta.status
      )
      const nextHref = formVersionHasChanged
        ? formHref
        : `${formHref}${ControllerPath.Summary}`

      // Set state and dispatch user into the form
      await setCacheState(request, submissionToCopy, form)

      return h.redirect(nextHref)
    },
    options: {
      auth: CITIZEN_AUTH_ROUTE_OPTIONS,
      validate: {
        params: Joi.object({
          formId: Joi.string().required(),
          referenceNumber: Joi.string().required()
        }).required(),
        payload: Joi.object()
          .keys({
            [CONFIRM_COPY_NAME]: Joi.boolean().required()
          })
          .required()
      }
    }
  })
]

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
 * @returns {{ formHasDeclaration: boolean, formVersionHasChanged: boolean }}
 */
function getFormDetails(def, submission) {
  const formHasDeclaration = def.pages
    .flatMap((p) => (hasFormComponents(p) ? p.components : []))
    .some((c) => c.type === ComponentType.DeclarationField)

  const latestVersionMetadata = /** @type {FormVersionMetadata | undefined} */ (
    def.metadata?.$$__formVersion
  )

  const { referenceNumber, status, versionMetadata } = submission.meta

  if (!latestVersionMetadata) {
    throw Boom.badData(
      `Cannot copy form '${referenceNumber}' because the latest ${status} version of the form definition doesn't contain versionMetadata`
    )
  }

  if (!versionMetadata) {
    throw Boom.badData(
      `Cannot copy form '${referenceNumber}' because the submission doesn't contain versionMetadata`
    )
  }

  const formVersionHasChanged =
    latestVersionMetadata.versionNumber > versionMetadata.versionNumber

  return { formHasDeclaration, formVersionHasChanged }
}

/**
 * Set the cache state with the copied submission
 * @param {Request<{ Params: CopyFormParams }>} request
 * @param {FormSubmissionDocument} submissionToCopy
 * @param {FormMetadata} form
 */
async function setCacheState(request, submissionToCopy, form) {
  const cacheService = getCacheService(request.server)
  const copiedState = mapValueToState(submissionToCopy)
  const state = submissionToCopy.meta.status
  const req = { yar: request.yar, params: { slug: form.slug, state } }

  await cacheService.clearState(req)
  await cacheService.setState(req, {
    ...copiedState,
    $$__referenceNumber: undefined
  })
}

/**
 * @typedef {{ formId: string, referenceNumber: string }} CopyFormParams
 */

/**
 * @import { ServerRoute, Request } from '@hapi/hapi'
 * @import { FormVersionMetadata, FormMetadata, FormDefinition } from '@defra/forms-model'
 * @import { FormSubmissionDocument } from '~/src/server/services/submissionService.js'
 */
