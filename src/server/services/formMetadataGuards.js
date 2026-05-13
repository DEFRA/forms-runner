import Boom from '@hapi/boom'

import * as rawFormsService from '~/src/server/services/formsService.js'

/**
 * Throws a Boom 503 stamped with `data.offline = true` when the form is
 * offline. The engine plugin's onPreResponse extension catches the marker
 * and renders the unavailable view at HTTP 200.
 * @param {FormMetadata} metadata
 */
function assertFormAvailable(metadata) {
  if (metadata.offline === true) {
    throw Boom.boomify(new Error(`Form ${metadata.slug} is offline`), {
      statusCode: 503,
      data: { offline: true, metadata }
    })
  }
}

/**
 * Returns true when the error is the offline marker thrown by the wrappers.
 * Re-throw from `catch` blocks so the engine plugin's onPreResponse can
 * render the unavailable view.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isOfflineBoom(err) {
  return (
    Boom.isBoom(err) &&
    !!err.data &&
    typeof err.data === 'object' &&
    /** @type {{ offline?: boolean }} */ (err.data).offline === true
  )
}

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

/**
 * @import { FormMetadata } from '@defra/forms-model'
 */
