import { submissionMessageSchema } from '@defra/forms-model'
import Joi from 'joi'

import { saveAndExitMapper } from '~/src/server/messaging/mappers/events.js'
import { publishEvent } from '~/src/server/messaging/publish-base.js'

/**
 * Helper to validate and publish an event
 * @param {SaveAndExitMessage} saveAndExitMessage
 */
async function validateAndPublishEvent(saveAndExitMessage) {
  const value = Joi.attempt(saveAndExitMessage, submissionMessageSchema, {
    abortEarly: false
  })

  return publishEvent(value)
}

/**
 * Publish 'save and exit' event
 * @param {string} formId
 * @param {string} email
 * @param {{ question: string, answer: string }} security
 * @param {FormState} state
 */
export async function publishSaveAndExitEvent(formId, email, security, state) {
  const message = saveAndExitMapper(formId, email, security, state)

  return validateAndPublishEvent(message)
}

/**
 * @import { FormState } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { SaveAndExitMessage } from '@defra/forms-model'
 */
