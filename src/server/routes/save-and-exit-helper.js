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
 * @import { Request } from '@hapi/hapi'
 * @import { SaveAndExitParams } from '~/src/server/models/save-and-exit.js'
 * @import { FormSubmissionState } from '@defra/forms-engine-plugin/engine/types.js'
 */
