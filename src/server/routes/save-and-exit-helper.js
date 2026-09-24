import { SAVE_AND_EXIT_PAYLOAD } from '~/src/server/constants.js'

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
  Deleted: 'deleted'
}

/**
 * Returns the status for a saved form.
 * @param {SavedForm | SavedFormState} savedForm
 */
export function getFormStatus(savedForm) {
  if (savedForm.isDeleted) {
    return SavedFormStatus.Deleted
  }

  if (new Date(savedForm.expireAt) <= new Date()) {
    return SavedFormStatus.Expired
  }

  return SavedFormStatus.InProgress
}

/**
 * @import { Request } from '@hapi/hapi'
 * @import { SaveAndExitParams } from '~/src/server/models/save-and-exit.js'
 * @import { FormSubmissionState } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { SavedForm, SavedFormState } from '~/src/server/services/submissionService.js'
 */
