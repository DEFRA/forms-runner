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
  const { value, error } = formMetadataSchema.validate(metadata)

  if (error) {
    throw error
  }

  return value
}

/**
 * Retrieves a form definition from the form manager for a given id
 * @param {string} id - the id of the form
 * @param {FormState} state - the state of the form
 */
export async function getFormDefinition(id, state) {
  const suffix = state === 'draft' ? '/draft' : ''
  const defintion = await getJson(
    `${managerUrl}/forms/${id}/definition${suffix}`
  )

  return defintion
}

/** @typedef {'draft'|'live'} FormState */
