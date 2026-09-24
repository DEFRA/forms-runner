import Boom from '@hapi/boom'

import { config } from '~/src/config/index.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import {
  del,
  get,
  getJson,
  postJson
} from '~/src/server/services/httpService.js'

const submissionUrl = config.get('submissionUrl')

/**
 * Retrieves a save-and-exit record from the form submission api for a given magic link
 * @param {string} magicLinkId - the id of the magic link
 */
export async function getSaveAndExitDetails(magicLinkId) {
  const getJsonByType = /** @type {typeof getJson<SaveAndExitDetails>} */ (
    getJson
  )

  const { payload: results } = await getJsonByType(
    `${submissionUrl}/save-and-exit/${magicLinkId}`
  )

  return results
}

/**
 * Validates correct password for a save-and-exit record from the form submission api for a given magic link
 * @param {string} magicLinkId - the id of the magic link
 * @param {string} securityAnswer - the security answer provided by the user
 */
export async function validateSaveAndExitCredentials(
  magicLinkId,
  securityAnswer
) {
  const postJsonByType =
    /** @type {typeof postJson<SaveAndExitResumeDetails>} */ (postJson)

  const { payload: results } = await postJsonByType(
    `${submissionUrl}/save-and-exit/${magicLinkId}`,
    {
      payload: {
        securityAnswer
      }
    }
  )

  if (!results) {
    throw new Error(
      'Unexpected empty response in validateSaveAndExitCredentials'
    )
  }

  return results
}

/**
 * Generates a unique reference number
 * @param {string} [prefix] - the prefix
 */
export async function generateReferenceNumber(prefix) {
  const postJsonByType =
    /** @type {typeof postJson<GenerateReferenceNumber>} */ (postJson)

  const query = prefix ? `?prefix=${prefix}` : ''
  const { payload: results } = await postJsonByType(
    `${submissionUrl}/submission/generate-reference-number${query}`,
    { payload: {}, timeout: 10 * 1000 } // 10 seconds
  )

  if (!results) {
    throw new Error('Unexpected empty response in generateReferenceNumber')
  }

  return results.referenceNumber
}

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
 * @property {string} magicLinkId - the link id
 * @property {string} [referenceNumber] - the reference number
 * @property {string} [formTitle] - the form title
 * @property {string} createdAt - created at date
 * @property {string} expireAt - expire at date
 * @property {boolean} [isDeleted] - is deleted marker
 */

/**
 * Gets the state of one saved form. The API returns it only to the citizen who
 * owns the saved form.
 * @param {string} accessToken - the citizen's access token
 * @param {string} magicLinkId - the id of the magic link
 */
export async function getSavedFormState(accessToken, magicLinkId) {
  const url = `${submissionUrl}/save-and-exit/records/${magicLinkId}`

  const { res, error, payload } = await get(url, {
    json: true,
    headers: { authorization: `Bearer ${accessToken}` }
  })

  if (error) {
    logger.error(
      error,
      `[savedFormState] Could not read the saved form - ${res.statusCode}`
    )
    throw Boom.badGateway('Could not read the saved form')
  }

  return /** @type {SavedFormState} */ (payload)
}

/**
 * Gets the state of one saved form. The API returns it only to the citizen who
 * owns the saved form.
 * @param {string} accessToken - the citizen's access token
 * @param {string} magicLinkId - the id of the magic link
 */
export async function deleteSavedFormState(accessToken, magicLinkId) {
  const url = `${submissionUrl}/save-and-exit/records/${magicLinkId}`

  const { res, error, payload } = await del(url, {
    json: true,
    headers: { authorization: `Bearer ${accessToken}` }
  })

  if (error) {
    logger.error(
      error,
      `[savedFormState] Could not delete the saved form - ${res.statusCode}`
    )
    throw Boom.badGateway('Could not delete the saved form')
  }

  return /** @type {{ matched: true, modified: boolean }} */ (payload)
}

/**
 * The state of one saved form, as forms-submission-api returns it.
 * @typedef {object} SavedFormState
 * @property {object} state - the saved answers
 * @property {string} referenceNumber - the form reference number
 * @property {{ id: string, title: string, status: FormStatus, isPreview: boolean, baseUrl: string }} form - the save and exit form details
 * @property {string} [magicLinkGroupId] - the group the record belongs to, if it has one
 * @property {string} expireAt - the expiry date
 * @property {boolean} [isDeleted] - the deleted marker
 */

/**
 * @import { FormStatus } from '@defra/forms-model'
 * @import { GenerateReferenceNumber, SaveAndExitDetails, SaveAndExitResumeDetails } from '~/src/server/types.js'
 */
