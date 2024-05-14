import { formMetadataSchema } from '@defra/forms-model'

import config from '~/src/server/config.js'
import { getJson } from '~/src/server/services/httpService.js'

const { managerUrl } = config

/**
 * Retrieves a form definition from the form manager for a given slug
 * @param {string} slug - the slug of the form
 */
export async function getFormMetadata(slug) {
  const getJsonByType = /** @type {typeof getJson<FormMetadata>} */ getJson

  const { payload: metadata } = await getJsonByType(
    `${managerUrl}/forms/slug/${slug}`
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
 * @param {'draft'|'live'} state - the state of the form
 */
export async function getFormDefinition(id, state) {
  const getJsonByType = /** @type {typeof getJson<FormDefinition>} */ getJson

  const suffix = state === 'draft' ? '/draft' : ''
  const { payload: definition } = await getJsonByType(
    `${managerUrl}/forms/${id}/definition${suffix}`
  )

  return definition
}

/**
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 * @typedef {import('@defra/forms-model').FormMetadata} FormMetadata
 */
