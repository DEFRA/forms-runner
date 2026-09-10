import Boom from '@hapi/boom'

import { config } from '~/src/config/index.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { get } from '~/src/server/services/httpService.js'

const submissionUrl = config.get('submissionUrl')

/**
 * The forms a citizen saved and has not yet submitted, soonest to expire
 * first. The access token names the citizen, so the request says which form
 * to list and nothing about whose records they are.
 * @param {string} accessToken - the citizen's access token
 * @param {string} formId - the form the records belong to
 * @returns {Promise<SavedForm[]>}
 */
export async function getSavedForms(accessToken, formId) {
  const url = `${submissionUrl}/save-and-exit/records?formId=${encodeURIComponent(formId)}`

  const { res, error, payload } = await get(url, {
    json: true,
    headers: { authorization: `Bearer ${accessToken}` }
  })

  if (error) {
    logger.error(
      error,
      `[savedForms] Could not read the saved forms - ${res.statusCode}`
    )
    throw Boom.badGateway('Could not read the saved forms')
  }

  return /** @type {SavedForm[]} */ (payload)
}

/**
 * One saved form, as forms-submission-api describes it.
 * @typedef {object} SavedForm
 * @property {string} magicLinkId
 * @property {string} [referenceNumber]
 * @property {string} [formTitle]
 * @property {string} createdAt
 * @property {string} expireAt
 */
