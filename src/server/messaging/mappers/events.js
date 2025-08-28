import { randomUUID } from 'crypto'

import {
  SubmissionEventMessageCategory,
  SubmissionEventMessageSchemaVersion,
  SubmissionEventMessageSource,
  SubmissionEventMessageType
} from '@defra/forms-model'

/**
 * @param { string } formId
 * @param { string } email
 * @param {{ question: string, answer: string }} security
 * @param { FormState } state
 * @returns {SaveAndExitMessage}
 */
export function saveAndExitMapper(formId, email, security, state) {
  /** @type {SaveAndExitMessageData} */
  const data = {
    formId,
    email,
    security,
    state
  }
  const now = new Date()
  return {
    schemaVersion: SubmissionEventMessageSchemaVersion.V1,
    category: SubmissionEventMessageCategory.RUNNER,
    source: SubmissionEventMessageSource.FORMS_RUNNER,
    type: SubmissionEventMessageType.RUNNER_SAVE_AND_EXIT,
    entityId: randomUUID(),
    createdAt: now,
    data,
    messageCreatedAt: now
  }
}

/**
 * @import { SaveAndExitMessage, SaveAndExitMessageData } from '@defra/forms-model'
 * @import { FormState } from '@defra/forms-engine-plugin/engine/types.js'
 */
