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
 * The returned entityId will be a newly-generated guid
 * @param {string} formId
 * @param {string} email
 * @param {{ question: SecurityQuestionsEnum, answer: string }} security
 * @param {{ status: FormStatus, isPreview: boolean }} formStatus
 * @param {FormState} state
 */
export async function publishSaveAndExitEvent(
  formId,
  email,
  security,
  formStatus,
  state
) {
  const message = saveAndExitMapper(formId, email, security, formStatus, state)

  return validateAndPublishEvent(message)
}

/**
 * @import { FormState } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormStatus, SaveAndExitMessage, SecurityQuestionsEnum } from '@defra/forms-model'
 */
