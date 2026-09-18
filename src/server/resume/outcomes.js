import { MAGIC_LINK_GROUP_ID } from '@defra/forms-engine-plugin'
import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import { StatusCodes } from 'http-status-codes'

import {
  RESUME_ERROR_PATH,
  RESUME_SUCCESS_PATH
} from '~/src/server/constants.js'

/**
 * Puts the saved answers back in the cache and sends the citizen to the
 * welcome back page. Both strategies end here, so the cache write lives in one
 * place.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @param {{ state: object, magicLinkGroupId?: string }} outcome
 * @param {ResumeContext} context
 */
export async function restoreState(request, h, outcome, context) {
  const cacheService = getCacheService(request.server)

  await cacheService.setState(/** @type {CacheRequest} */ (request), {
    ...outcome.state,
    [MAGIC_LINK_GROUP_ID]: outcome.magicLinkGroupId
  })

  return h.redirect(
    `${RESUME_SUCCESS_PATH}/${context.form.slug}${context.slugAndState}`
  )
}

/**
 * Sends the citizen to the resume error page for this form.
 * @param {ResponseToolkit} h
 * @param {ResumeContext} context
 */
export function showResumeError(h, context) {
  return h
    .redirect(`${RESUME_ERROR_PATH}/${context.form.slug}`)
    .code(StatusCodes.SEE_OTHER)
}

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 * @import { ResumeContext } from '~/src/server/resume/types.js'
 * @import { CacheRequest } from '@defra/forms-engine-plugin/engine/types.js'
 */
