import { formMetadataSchema } from '@defra/forms-model'

import config from '~/src/server/config.js'
import { getJson } from '~/src/server/plugins/engine/services/httpService.js'

const { managerUrl } = config

/**
 * Retrieves a form definition from the form manager for a given slug
 * @param {string} slug - the slug of the form
 */
export async function getFormMetadata(slug) {
  const metadata = await getJson(`${managerUrl}/forms/slug/${slug}`)

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
  const suffix = state === 'draft' ? '/draft' : ''
  const definition = await getJson(
    `${managerUrl}/forms/${id}/definition${suffix}`
  )

  return definition
}
