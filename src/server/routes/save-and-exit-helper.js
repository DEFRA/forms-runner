import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'

import { FormRowStatus, SAVE_AND_EXIT_PAYLOAD } from '~/src/server/constants.js'
import { sessionNames } from '~/src/server/helpers/session-names.js'
import { getFormMetadataWithGuard } from '~/src/server/services/formMetadataGuards.js'

/**
 * Get Save and Exit payload - extracted here to a separate file so it can easily be mocked
 * @param {Request<{ Params: SaveAndExitParams }>} request
 */
export function getPayloadFromFlash(request) {
  return request.yar.flash(SAVE_AND_EXIT_PAYLOAD)
}

/**
 * Check that the form has state
 * @param {FormSubmissionState} formState
 */
export function hasState(formState) {
  return Object.keys(formState).length > 0
}

/**
 * Returns the status for a saved form.
 * @param {SavedFormState} savedForm
 */
export function getFormStatus(savedForm) {
  if (savedForm.isDeleted) {
    return FormRowStatus.Deleted
  }

  if (savedForm.isProcessing) {
    return FormRowStatus.Processing
  }

  if (new Date(savedForm.expireAt) <= new Date()) {
    return FormRowStatus.Expired
  }

  return FormRowStatus.InProgress
}

/**
 *
 * @param {Request<{ Params: FormParams }>} request
 * @param {string} slug
 * @param {FormStatus} state
 */
export async function clearFormState(request, slug, state) {
  const form = await getFormMetadataWithGuard(slug, state)

  // Clear any previous form session state
  const cacheService = getCacheService(request.server)
  await cacheService.clearState(request)

  return form
}

/**
 * Generate a key (bucket name) for in-flight forms based on the slug, and status, so that
 * all in-flight forms for the same slug and status are grouped together.
 * @param {string} slug
 * @param { FormStatus | undefined } status
 * @returns {string}
 */
export function getInflightSessionKey(slug, status) {
  return `${sessionNames.inFlightForms}:${slug}:${status ?? ''}`
}

/**
 * @import { Request } from '@hapi/hapi'
 * @import { FormStatus } from '@defra/forms-model'
 * @import { SaveAndExitParams } from '~/src/server/models/save-and-exit.js'
 * @import { FormSubmissionState } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormParams } from '@defra/forms-engine-plugin/types'
 * @import { SavedFormState } from '~/src/server/services/submissionService.js'
 */
