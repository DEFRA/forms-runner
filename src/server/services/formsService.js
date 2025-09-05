import { FormStatus } from '@defra/forms-engine-plugin/types'
import { formMetadataSchema } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { getJson, postJson } from '~/src/server/services/httpService.js'

/**
 * Retrieves a form definition from the form manager for a given slug
 * @param {string} slug - the slug of the form
 */
export async function getFormMetadata(slug) {
  const getJsonByType = /** @type {typeof getJson<FormMetadata>} */ (getJson)

  const { payload: metadata } = await getJsonByType(
    `${config.get('managerUrl')}/forms/slug/${slug}`
  )

  // Run it through the schema to coerce dates
  const result = formMetadataSchema.validate(metadata)

  if (result.error) {
    throw result.error
  }

  return result.value
}

/**
 * Retrieves a form metadata from the form manager for a given form id
 * @param {string} formId - the slug of the form
 */
export async function getFormMetadataById(formId) {
  const getJsonByType = /** @type {typeof getJson<FormMetadata>} */ (getJson)

  const { payload: metadata } = await getJsonByType(
    `${config.get('managerUrl')}/forms/${formId}`
  )

  // Run it through the schema to coerce dates
  const result = formMetadataSchema.validate(metadata)

  if (result.error) {
    throw result.error
  }

  return result.value
}

/**
 * Retrieves a form definition from the form manager for a given id
 * @param {string} id - the id of the form
 * @param {FormStatus} state - the state of the form
 */
export async function getFormDefinition(id, state) {
  const getJsonByType = /** @type {typeof getJson<FormDefinition>} */ (getJson)

  const suffix = state === FormStatus.Draft ? `/${state}` : ''
  const { payload: definition } = await getJsonByType(
    `${config.get('managerUrl')}/forms/${id}/definition${suffix}`
  )

  return definition
}

/**
 * Retrieves a save-and-exit record from the form submission api for a given magic link
 * @param {string} magicLinkId - the id of the magic link
 */
export async function getSaveAndExitDetails(magicLinkId) {
  const getJsonByType = /** @type {typeof getJson<SaveAndExitDetails>} */ (
    getJson
  )

  const { payload: results } = await getJsonByType(
    `${config.get('submissionUrl')}/save-and-exit/${magicLinkId}`
  )

  return results
}

/**
 * Retrieves a save-and-exit record from the form submission api for a given magic link
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
    `${config.get('submissionUrl')}/save-and-exit`,
    {
      payload: {
        magicLinkId,
        securityAnswer
      }
    }
  )

  return results
}

/**
 * @import { FormDefinition, FormMetadata } from '@defra/forms-model'
 * @import { SaveAndExitDetails, SaveAndExitResumeDetails } from '~/src/server/types.js'
 */
