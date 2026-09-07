import { MAGIC_LINK_GROUP_ID } from '@defra/forms-engine-plugin'
import {
  FormStatus,
  SubmissionEventMessageCategory,
  SubmissionEventMessageSchemaVersion,
  SubmissionEventMessageSource,
  SubmissionEventMessageType
} from '@defra/forms-model'

import { config } from '~/src/config/index.js'

const baseUrl = config.get('baseUrl')

/**
 * For legacy V1 save-and-exit
 * @param { string } formId
 * @param { string } formTitle
 * @param { string } email
 * @param {{ question: SecurityQuestionsEnum, answer: string }} security
 * @param { FormState } state
 * @param { FormStatus } [status]
 * @returns {SaveAndExitMessage}
 */
export function saveAndExitV1Mapper(
  formId,
  formTitle,
  email,
  security,
  state,
  status
) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const magicLinkGroupId = state ? state[MAGIC_LINK_GROUP_ID] : undefined
  const extraProp =
    typeof magicLinkGroupId === 'string' ? { magicLinkGroupId } : {}

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
    ...extraProp
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
 * For V2 save-and-exit
 * @param { string } formId
 * @param { string } formTitle
 * @param { string } email
 * @param { FormState } state
 * @param { FormStatus } [status]
 * @returns {SaveAndExitV2Message}
 */
export function saveAndExitV2Mapper(formId, formTitle, email, state, status) {
  /** @type {SaveAndExitV2MessageData} */
  const data = {
    form: {
      id: formId,
      title: formTitle,
      status: status ?? FormStatus.Live,
      isPreview: !!status,
      baseUrl
    },
    email,
    state
  }
  const now = new Date()
  return {
    schemaVersion: SubmissionEventMessageSchemaVersion.V1,
    category: SubmissionEventMessageCategory.RUNNER,
    source: SubmissionEventMessageSource.FORMS_RUNNER,
    type: SubmissionEventMessageType.RUNNER_SAVE_AND_EXIT_V2,
    createdAt: now,
    data,
    messageCreatedAt: now
  }
}

/**
 * @import { SaveAndExitMessage, SaveAndExitV2Message, SaveAndExitMessageData, SaveAndExitV2MessageData, SecurityQuestionsEnum } from '@defra/forms-model'
 * @import { FormState } from '@defra/forms-engine-plugin/engine/types.js'
 */
