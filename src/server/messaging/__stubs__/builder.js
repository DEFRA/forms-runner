import {
  FormStatus,
  SecurityQuestionsEnum,
  SubmissionEventMessageCategory,
  SubmissionEventMessageSchemaVersion,
  SubmissionEventMessageType
} from '@defra/forms-model'

export const saveAndExitFormId = '2b655402-43fd-4339-928e-499dd68ddb9b'

/**
 * @param { Partial<SaveAndExitMessageData> } partialSaveAndExitMessageData
 * @returns {SaveAndExitMessageData}
 */
export function buildSaveAndExitMessageData(
  partialSaveAndExitMessageData = {}
) {
  return {
    form: {
      id: 'formId',
      title: 'My First Form',
      isPreview: false,
      status: FormStatus.Draft,
      baseUrl: 'http://localhost:3009'
    },
    security: {
      question: SecurityQuestionsEnum.MemorablePlace,
      answer: 'a1'
    },
    email: 'forms@example.com',
    state: {},
    ...partialSaveAndExitMessageData
  }
}

/**
 * @param { Partial<SaveAndExitMessage> } partialSaveAndExitMessage
 * @returns {SaveAndExitMessage}
 */
export function buildSaveAndExitMessage(partialSaveAndExitMessage = {}) {
  return /** @type {SaveAndExitMessage} */ ({
    type: SubmissionEventMessageType.RUNNER_SAVE_AND_EXIT,
    category: SubmissionEventMessageCategory.RUNNER,
    createdAt: new Date('2025-07-23'),
    data: buildSaveAndExitMessageData(),
    schemaVersion: SubmissionEventMessageSchemaVersion.V1,
    ...partialSaveAndExitMessage
  })
}

/**
 * @import { SaveAndExitMessage, SaveAndExitMessageData } from '@defra/forms-model'
 */
