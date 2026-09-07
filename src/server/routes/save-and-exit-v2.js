import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'

import { CITIZEN_SESSION } from '~/src/server/auth/scheme.js'
import { publishSaveAndExitV2Event } from '~/src/server/messaging/publish.js'
import {
  confirmationViewModel,
  getKey,
  paramsSchema
} from '~/src/server/models/save-and-exit-v2.js'
import { stateHandler } from '~/src/server/routes/save-and-exit-state-handler.js'
import { getFormTranslator } from '~/src/server/routes/save-and-exit.js'
import { getFormMetadataWithGuard } from '~/src/server/services/formMetadataGuards.js'

// Route base
const SAVE_AND_EXIT_ROUTE_BASE = 'save-and-exit-v2'

// View paths
const SAVE_AND_EXIT_CONFIRMATION = 'save-and-exit-v2/confirmation'

export default [
  /**
   * @satisfies {ServerRoute<{ Params: SaveAndExitParams }>}
   */
  ({
    method: 'GET',
    path: `/${SAVE_AND_EXIT_ROUTE_BASE}/{slug}/{state?}`,
    async handler(request, h) {
      const { params, auth } = request
      const { slug, state: status } = params
      const metadata = await getFormMetadataWithGuard(slug, status)
      const { translator } = await getFormTranslator(request, metadata, status)

      const model = confirmationViewModel(metadata, translator, status)

      const cacheService = getCacheService(
        /** @type {AnyRequest} */ (/** @type {unknown} */ (request)).server
      )

      // Store any outstanding data from the current page in a special attribute
      // (in case the current page wasn't yet validated and saved).
      // Handle the user navigating back from previously submitting a save-and-exit. The state has been cleared
      // so just show the form from the start
      if (await stateHandler(request)) {
        return h.redirect(model.serviceUrl)
      }

      await publishSaveAndExitV2Event(
        metadata.id,
        metadata.title,
        /** @type {string} */ (auth.credentials.email),
        await cacheService.getState(/** @type {CacheRequest} */ (request)),
        status
      )

      // Clear any previous save and exit session state
      request.yar.clear(getKey(slug, status))
      await cacheService.clearState(request)

      // Log out?
      // TODO

      return h
        .view(SAVE_AND_EXIT_CONFIRMATION, model)
        .header('Cache-Control', 'no-cache, no-store, must-revalidate')
    },
    options: {
      auth: { mode: 'required', strategy: CITIZEN_SESSION },
      validate: {
        params: paramsSchema
      }
    }
  })
]

/**
 * @import { ServerRoute, RequestQuery } from '@hapi/hapi'
 * @import { Yar } from '@hapi/yar'
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { Translator } from '@defra/forms-engine-plugin/engine/i18n/types.js'
 * @import { AnyRequest, CacheRequest, FormPayload } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { SaveAndExitParams } from '~/src/server/models/save-and-exit.js'
 */
