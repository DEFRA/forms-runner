import { FormStatus } from '@defra/forms-engine-plugin/types'
import { formMetadataSchema } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { MetadataValidationError } from '~/src/server/services/errors.js'
import { decryptSecret } from '~/src/server/services/helpers/crypto.js'
import { getJson, postJson } from '~/src/server/services/httpService.js'

const managerUrl = config.get('managerUrl')
const submissionUrl = config.get('submissionUrl')

/**
 * Retrieves a form metadata from the form manager for a given slug
 * @param {string} slug - the slug of the form
 */
export async function getFormMetadata(slug) {
  const getJsonByType = /** @type {typeof getJson<FormMetadata>} */ (getJson)

  const { payload: metadata } = await getJsonByType(
    `${managerUrl}/forms/slug/${slug}`
  )

  // Run it through the schema to coerce dates, allowing unknown fields (e.g. language)
  const result = formMetadataSchema.validate(metadata, { allowUnknown: true })

  if (result.error) {
    throw new MetadataValidationError(result.error)
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
    `${managerUrl}/forms/${formId}`
  )

  // Run it through the schema to coerce dates, allowing unknown fields (e.g. language)
  const result = formMetadataSchema.validate(metadata, { allowUnknown: true })

  if (result.error) {
    throw new MetadataValidationError(result.error)
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
    `${managerUrl}/forms/${id}/definition${suffix}`
  )

  return definition
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
 * Retrieves a form secret and decrypts the value
 * @param {string} formId - the id of the form
 * @param {string} secretName - the name of the secret
 */
export async function getFormSecret(formId, secretName) {
  const response = await fetch(
    `${managerUrl}/forms/${formId}/secrets/${secretName}`
  )
  if (response.statusText !== 'OK') {
    return ''
  }
  return decryptSecret(await response.text())
}

/**
 * @import { FormDefinition, FormMetadata } from '@defra/forms-model'
 * @import { GenerateReferenceNumber } from '~/src/server/types.js'
 */
