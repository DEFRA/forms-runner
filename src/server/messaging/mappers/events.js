import {
  FormStatus,
  SubmissionEventMessageCategory,
  SubmissionEventMessageSchemaVersion,
  SubmissionEventMessageSource,
  SubmissionEventMessageType
} from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { SOURCE_MAGIC_LINK_ID } from '~/src/server/routes/save-and-exit.js'

const baseUrl = config.get('baseUrl')

/**
 * @param { string } formId
 * @param { string } formTitle
 * @param { string } email
 * @param {{ question: SecurityQuestionsEnum, answer: string }} security
 * @param { FormState } state
 * @param { FormStatus } [status]
 * @returns {SaveAndExitMessage}
 */
export function saveAndExitMapper(
  formId,
  formTitle,
  email,
  security,
  state,
  status
) {
  const sourceMagicLinkId = state[SOURCE_MAGIC_LINK_ID]

  /** @type {SaveAndExitMessageData} */
  const data = {
    form: {
      id: formId,
      title: formTitle,
      status: status ?? FormStatus.Live,
      isPreview: !!status,
      baseUrl
    },
    email,
    security,
    state,
    sourceMagicLinkId:
      typeof sourceMagicLinkId === 'string' ? sourceMagicLinkId : ''
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
 * @import { SaveAndExitMessage, SaveAndExitMessageData, SecurityQuestionsEnum } from '@defra/forms-model'
 * @import { FormState } from '@defra/forms-engine-plugin/engine/types.js'
 */
