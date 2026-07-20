import { FormStatus } from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import { getFormDefinition } from '~/src/server/services/formsService.js'

/**
 * @param {string} id
 * @param {FormStatus} status
 */
export async function getFormDefinitionWithFallback(id, status) {
  let definition

  try {
    definition = await getFormDefinition(id, status)
  } catch (err) {
    const error = /** @type {{ output?: { statusCode?: StatusCodes }}} */ (err)
    if (error.output?.statusCode === StatusCodes.NOT_FOUND) {
      definition = await getFormDefinition(
        id,
        status === FormStatus.Draft ? FormStatus.Live : FormStatus.Draft
      )
    }
  }
  return definition
}
