import { assertFormAvailable } from '@defra/forms-engine-plugin'
import { FormStatus } from '@defra/forms-model'

import * as rawFormsService from '~/src/server/services/formsService.js'

/**
 * Fetch form metadata by slug.
 * @param {string} slug
 */
export async function getFormMetadata(slug) {
  const metadata = await rawFormsService.getFormMetadata(slug)
  return metadata
}

/**
 * Fetch form metadata by slug. Throws the offline marker when the form has
 * been taken offline so route handlers don't have to check.
 * @param {string} slug
 * @param { FormStatus | undefined } formStatus
 */
export async function getFormMetadataWithGuard(slug, formStatus) {
  const metadata = await rawFormsService.getFormMetadata(slug)
  assertFormAvailable(metadata, formStatus ?? FormStatus.Live, false)
  return metadata
}

/**
 * Fetch form metadata by id. Throws the offline marker when the form has
 * been taken offline.
 * @param {string} formId
 * @param {FormStatus} [formStatus]
 */
export async function getFormMetadataById(formId, formStatus) {
  const metadata = await rawFormsService.getFormMetadataById(formId)
  assertFormAvailable(metadata, formStatus ?? FormStatus.Live, false)
  return metadata
}
