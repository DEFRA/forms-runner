import {
  SubmissionEventMessageCategory,
  SubmissionEventMessageSchemaVersion,
  SubmissionEventMessageSource,
  SubmissionEventMessageType
} from '@defra/forms-model'

/**
 * @param { string } formId
 * @param { string } email
 * @param {{ question: SecurityQuestionsEnum, answer: string }} security
 * @param {{ status: FormStatus, isPreview: boolean }} formStatus
 * @param { FormState } state
 * @returns {SaveAndExitMessage}
 */
export function saveAndExitMapper(formId, email, security, formStatus, state) {
  /** @type {SaveAndExitMessageData} */
  const data = {
    formId,
    email,
    security,
    formStatus,
    state
  }
  const now = new Date()
  return {
    schemaVersion: SubmissionEventMessageSchemaVersion.V1,
    category: SubmissionEventMessageCategory.RUNNER,
    source: SubmissionEventMessageSource.FORMS_RUNNER,
    type: SubmissionEventMessageType.RUNNER_SAVE_AND_EXIT,
    createdAt: now,
    data,
    messageCreatedAt: now
  }
}

/**
 * @import { FormStatus, SaveAndExitMessage, SaveAndExitMessageData, SecurityQuestionsEnum } from '@defra/forms-model'
 * @import { FormState } from '@defra/forms-engine-plugin/engine/types.js'
 */
