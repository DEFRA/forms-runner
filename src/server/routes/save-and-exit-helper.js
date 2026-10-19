import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'

import { SAVE_AND_EXIT_PAYLOAD } from '~/src/server/constants.js'
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
 * The status of a saved form. Each value is also the translation key of the
 * tag the table shows for it.
 */
export const SavedFormStatus = {
  InProgress: 'inProgress',
  Expired: 'expired',
  Deleted: 'deleted',
  Processing: 'processing'
}

/**
 * Returns the status for a saved form.
 * @param {SavedForm | SavedFormState} savedForm
 */
export function getFormStatus(savedForm) {
  if (savedForm.isDeleted) {
    return SavedFormStatus.Deleted
  }

  if (savedForm.isProcessing) {
    return SavedFormStatus.Processing
  }

  if (new Date(savedForm.expireAt) <= new Date()) {
    return SavedFormStatus.Expired
  }

  return SavedFormStatus.InProgress
}

/**
 *
 * @param {AnyRequest} request
 * @param {string} slug
 * @param {boolean} isPreview
 * @param {FormStatus} state
 */
export async function clearFormState(request, slug, isPreview, state) {
  const form = await getFormMetadataWithGuard(slug, state)

  // Clear any previous form session state
  const cacheService = getCacheService(
    /** @type {AnyRequest} */ (/** @type {unknown} */ (request)).server
  )
  // CacheService derives its key from request.params.state, but on this route
  // state is a query param, so supply the same params the form pages use.
  await cacheService.clearState(
    /** @type {CacheRequest} */ (
      /** @type {unknown} */ ({
        yar: request.yar,
        params: { slug, state: isPreview ? state : undefined }
      })
    )
  )

  return form
}

/**
 * @import { Request } from '@hapi/hapi'
 * @import { FormStatus } from '@defra/forms-model'
 * @import { SaveAndExitParams } from '~/src/server/models/save-and-exit.js'
 * @import { AnyRequest, CacheRequest, FormSubmissionState } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { SavedForm, SavedFormState } from '~/src/server/services/submissionService.js'
 */
