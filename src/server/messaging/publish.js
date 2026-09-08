import { submissionMessageSchema } from '@defra/forms-model'
import Joi from 'joi'

import {
  saveAndExitV1Mapper,
  saveAndExitV2Mapper
} from '~/src/server/messaging/mappers/events.js'
import { publishEvent } from '~/src/server/messaging/publish-base.js'

/**
 * Helper to validate and publish an event
 * @param { SaveAndExitMessage | SaveAndExitV2Message } saveAndExitMessage
 */
async function validateAndPublishEvent(saveAndExitMessage) {
  const value = Joi.attempt(saveAndExitMessage, submissionMessageSchema, {
    abortEarly: false
  })

  return publishEvent(value)
}

/**
 * Publish 'save and exit' event (v1)
 * The returned entityId will be a newly-generated guid.
 * V1 save-and-exit stores a magic link for user-retrieval of state.
 * @param {string} formId
 * @param {string} formTitle
 * @param {string} email
 * @param {{ question: SecurityQuestionsEnum, answer: string }} security
 * @param {FormState} state
 * @param {FormStatus} [status]
 */
export async function publishSaveAndExitV1Event(
  formId,
  formTitle,
  email,
  security,
  state,
  status
) {
  const message = saveAndExitV1Mapper(
    formId,
    formTitle,
    email,
    security,
    state,
    status
  )

  return validateAndPublishEvent(message)
}

/**
 * Publish 'save and exit' event (v2)
 * V2 save-and-exit stores state against the logged-in user.
 * @param {string} formId
 * @param {string} formTitle
 * @param {{ sub: string, issuer: string }} auth
 * @param {FormState} state
 * @param {FormStatus} [status]
 */
export async function publishSaveAndExitV2Event(
  formId,
  formTitle,
  auth,
  state,
  status
) {
  const message = saveAndExitV2Mapper(formId, formTitle, auth, state, status)

  return validateAndPublishEvent(message)
}

/**
 * @import { FormState } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormStatus, SaveAndExitMessage, SaveAndExitV2Message, SecurityQuestionsEnum } from '@defra/forms-model'
 */
