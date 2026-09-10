import {
  CURRENT_PAGE_PATH_KEY,
  STATE_NOT_YET_VALIDATED
} from '@defra/forms-engine-plugin'
import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import * as Hoek from '@hapi/hoek'

import {
  getPayloadFromFlash,
  hasState
} from '~/src/server/routes/save-and-exit-helper.js'

/**
 * Check the cached form state and preserve any unvalidated page payload.
 * @param {Request<{ Params: SaveAndExitParams }>} request
 * @returns {Promise<boolean>} true when no state exists and the user should be redirected to the form
 */
export async function stateHandler(request) {
  // Store any outstanding data from the current page in a special attribute
  // (in case the current page wasn't yet validated and saved).
  // The current page state may be invalid so we don't want to push into the cache as normal properties.
  const cacheService = getCacheService(
    /** @type {AnyRequest} */ (/** @type {unknown} */ (request)).server
  )
  const formState = await cacheService.getState(
    /** @type {CacheRequest} */ (request)
  )

  // Handle the user navigating back from previously submitting a save-and-exit. The state has been cleared
  // so just show the form from the start
  if (!hasState(formState)) {
    return true
  }

  const pagePayload = getPayloadFromFlash(request)
  const currentPagePayload = Array.isArray(pagePayload)
    ? {}
    : /** @type { FormPayload | undefined } */ (pagePayload)
  const currentPagePath =
    currentPagePayload && CURRENT_PAGE_PATH_KEY in currentPagePayload
      ? currentPagePayload[CURRENT_PAGE_PATH_KEY]
      : undefined

  if (currentPagePath) {
    const combinedState = Hoek.merge(
      formState,
      {
        [STATE_NOT_YET_VALIDATED]: {
          ...currentPagePayload,
          [CURRENT_PAGE_PATH_KEY]: currentPagePath
        }
      },
      {
        mergeArrays: false
      }
    )
    await cacheService.setState(
      /** @type {CacheRequest} */ (request),
      combinedState
    )
  }
  return false
}

/**
 * @import { Request } from '@hapi/hapi'
 * @import { SaveAndExitParams } from '~/src/server/models/save-and-exit.js'
 * @import { FormSubmissionState } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { AnyRequest, CacheRequest, FormPayload } from '@defra/forms-engine-plugin/engine/types.js'
 */
