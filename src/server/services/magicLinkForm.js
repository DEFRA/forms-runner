import { isOfflineBoom } from '@defra/forms-engine-plugin'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { getFormMetadataById } from '~/src/server/services/formMetadataGuards.js'

/**
 * The form a magic link names. The routes call this before they read the
 * link, so that an offline form gives no timing clue about whether the link is
 * valid. The offline error is thrown on to show the offline page. Any other
 * failure gives undefined, so that the route sends the citizen to its resume
 * error page.
 * @param {string} formId
 * @param {string} magicLinkId
 * @param {FormStatus} [formStatus]
 */
export async function getMagicLinkForm(formId, magicLinkId, formStatus) {
  try {
    return await getFormMetadataById(formId, formStatus)
  } catch (err) {
    if (isOfflineBoom(err)) {
      throw err
    }

    logger.error(
      err,
      `Invalid formId ${formId} in magic link id ${magicLinkId}`
    )

    return undefined
  }
}

/**
 * @import { FormStatus } from '@defra/forms-model'
 */
