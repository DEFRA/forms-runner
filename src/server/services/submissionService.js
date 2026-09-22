import Boom from '@hapi/boom'

import { config } from '~/src/config/index.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { get, getJson, postJson } from '~/src/server/services/httpService.js'

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
 * @param {FormStatus} [preview] - the preview state, or none for a live form
 * @returns {Promise<SavedForm[]>}
 */
export async function getSavedForms(accessToken, formId, preview) {
  const query = new URLSearchParams({ formId })
  if (preview) {
    query.set('preview', preview)
  }

  const url = `${submissionUrl}/save-and-exit/records?${query}`

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

/**
 * Gets the state of one saved form. The API returns it only to the citizen who
 * owns the saved form, and only for the origin it was saved from.
 * @param {string} accessToken - the citizen's access token
 * @param {string} magicLinkId - the id of the magic link
 * @param {FormStatus} [preview] - the preview state, or none for a live form
 */
export async function getSavedFormState(accessToken, magicLinkId, preview) {
  const query = preview ? `?preview=${preview}` : ''
  const url = `${submissionUrl}/save-and-exit/records/${magicLinkId}${query}`

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
 * The state of one saved form, as forms-submission-api returns it.
 * @typedef {object} SavedFormState
 * @property {object} state
 * @property {string} [magicLinkGroupId]
 */

/**
 * @import { FormStatus } from '@defra/forms-model'
 * @import { GenerateReferenceNumber, SaveAndExitDetails, SaveAndExitResumeDetails } from '~/src/server/types.js'
 */
