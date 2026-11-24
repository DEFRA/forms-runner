import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import {
  FormStatus,
  getErrorMessage,
  isAllowCopyEnabled
} from '@defra/forms-model'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { FormRowStatus, SessionKeys } from '~/src/server/constants.js'
import { linkEarlierSubmissions } from '~/src/server/routes/homepage.js'
import { getFormTranslator } from '~/src/server/routes/save-and-exit.js'
import { getFormMetadataWithoutGuard } from '~/src/server/services/formMetadataGuards.js'
import { getFormDefinition } from '~/src/server/services/formsService.js'
import { getFormRecords } from '~/src/server/services/submissionService.js'
import {
  getFormMetadataIfExists,
  resolveLanguage
} from '~/src/server/utils/utils.js'

/**
 * Check if the user has any submitted forms linked to the given form slug and status.
 * Previous user submissions are linked before checking for submitted forms.
 * @param {Request<{ Params: FormParams }>} request
 * @param {string} slug
 * @param {FormStatus} formStatus
 * @param {string} accessToken
 * @param {boolean} isPreview
 * @returns {Promise<boolean>}
 */
export async function checkSubmittedFormsAndLink(
  request,
  slug,
  formStatus,
  accessToken,
  isPreview
) {
  const form = await getFormMetadataWithoutGuard(slug)
  const definition = await getFormDefinition(form.id, formStatus)
  if (definition && isAllowCopyEnabled(definition)) {
    await linkEarlierSubmissions(accessToken, form.id)

    const savedForms = await getFormRecords(
      accessToken,
      form.id,
      isPreview ? formStatus : undefined
    )
    const relevantForms = savedForms.filter(
      (record) =>
        record.status === FormRowStatus.Submitted ||
        record.status === FormRowStatus.InProgress
    )
    if (relevantForms.length > 0) {
      // Redirect to homepage if no existing state
      const existingState = await hasExistingFormState(request)
      return !existingState
    }
  }
  return false
}

/**
 * Checks if there is any existing form state in the cache for the current request.
 * @param {Request<{ Params: FormParams }>} request
 * @returns {Promise<boolean>} True if there is existing form state, false otherwise.
 */
async function hasExistingFormState(request) {
  const cacheService = getCacheService(request.server)
  const state = await cacheService.getState(request)
  return Object.keys(state).some((key) => key !== SessionKeys.REFERENCE_NUMBER)
}

/**
 * @param {Request<{ Params: FormParams }>} request
 * @returns {{ remainingPath: string, queryParams: string }}
 */
export function getPathAndQuery(request) {
  return {
    remainingPath: request.params.remainingPath
      ? `/${request.params.remainingPath}`
      : '',
    queryParams: request.url.search
  }
}

/**
 * Gets the language and title of the form for the current request.
 * @param {Pick<Request<ReqRefDefaults>, "server" | "yar" | "info" | "query">} request
 * @param { string | undefined } formSlug
 * @returns {Promise<{ language: string, formTitle?: string }>}
 */
export async function getLanguageAndTitle(request, formSlug) {
  let language = resolveLanguage(request.query, request.yar)
  let formTitle
  // The title of the form is only shown in the security code email, so a sign in
  // still goes ahead when forms-manager is down or the form doesn't exist
  try {
    const form = await getFormMetadataIfExists(formSlug)
    if (form) {
      const translated = await getFormTranslator(
        request,
        form,
        form.live ? FormStatus.Live : FormStatus.Draft
      )
      formTitle = /** @type {string} */ (translated.translator.tForm('title'))
      language = translated.language
    }
  } catch (err) {
    logger.warn(
      `[signInFormTitle] Could not get the form title for ${formSlug} - ${getErrorMessage(err)}`
    )
  }
  return { language, formTitle }
}

/**
 * @import { Request, ReqRefDefaults } from '@hapi/hapi'
 * @import { FormParams } from '@defra/forms-engine-plugin/types'
 */
