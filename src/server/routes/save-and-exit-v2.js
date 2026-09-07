import {
  CURRENT_PAGE_PATH_KEY,
  STATE_NOT_YET_VALIDATED
} from '@defra/forms-engine-plugin'
import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import { FormStatus } from '@defra/forms-model'
import * as Hoek from '@hapi/hoek'

import { CITIZEN_SESSION } from '~/src/server/auth/scheme.js'
import { EN_GB } from '~/src/server/constants.js'
import { getCachedFormTranslatorExternalRoutes } from '~/src/server/i18n/form.js'
import { publishSaveAndExitV2Event } from '~/src/server/messaging/publish.js'
import {
  confirmationViewModel,
  getKey,
  paramsSchema
} from '~/src/server/models/save-and-exit-v2.js'
import {
  getPayloadFromFlash,
  hasState
} from '~/src/server/routes/save-and-exit-helper.js'
import { getFormMetadataWithGuard } from '~/src/server/services/formMetadataGuards.js'
import { getFormDefinitionWithFallback } from '~/src/server/services/helpers/formsServiceHelper.js'
import {
  isLanguageSupported,
  resolveLanguage
} from '~/src/server/utils/utils.js'

// Route base
const SAVE_AND_EXIT_ROUTE_BASE = 'save-and-exit-v2'

// View paths
const SAVE_AND_EXIT_CONFIRMATION = 'save-and-exit-v2/confirmation'

/**
 *
 * @param {{ query: RequestQuery, yar: Yar }} request
 * @param {FormMetadata} metadata - the metadata of the form
 * @param {FormStatus} status
 * @returns {Promise<{ translator: Translator, language: string }>}
 */
export async function getFormTranslator(
  request,
  metadata,
  status = metadata.live ? FormStatus.Live : FormStatus.Draft
) {
  let language = resolveLanguage(request.query, request.yar)

  if (language !== EN_GB) {
    const definition = await getFormDefinitionWithFallback(metadata.id, status)

    if (!isLanguageSupported(language, definition)) {
      // If not translations defined in the FormDefinition, always default to English
      language = EN_GB
    }
  }

  const translator = await getCachedFormTranslatorExternalRoutes(
    metadata,
    status,
    language
  )

  return { translator, language }
}

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
        return h.redirect(model.serviceUrl)
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

      if (!auth.credentials.email) {
        throw new Error('User not logged in')
      }

      await publishSaveAndExitV2Event(
        metadata.id,
        metadata.title,
        auth.credentials.email,
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
