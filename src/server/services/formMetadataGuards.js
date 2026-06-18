import { assertFormAvailable } from '@defra/forms-engine-plugin'

import * as rawFormsService from '~/src/server/services/formsService.js'

/**
 * Fetch form metadata by slug. Throws the offline marker when the form has
 * been taken offline so route handlers don't have to check.
 * @param {string} slug
 */
export async function getFormMetadata(slug) {
  const metadata = await rawFormsService.getFormMetadata(slug)
  assertFormAvailable(metadata)
  return metadata
}

/**
 * Fetch form metadata by id. Throws the offline marker when the form has
 * been taken offline.
 * @param {string} formId
 */
export async function getFormMetadataById(formId) {
  const metadata = await rawFormsService.getFormMetadataById(formId)
  assertFormAvailable(metadata)
  return metadata
}
