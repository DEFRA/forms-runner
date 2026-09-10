import {
  FormStatus,
  SecurityQuestionsEnum,
  SubmissionEventMessageCategory,
  SubmissionEventMessageSchemaVersion,
  SubmissionEventMessageSource,
  SubmissionEventMessageType
} from '@defra/forms-model'
import { ValidationError } from 'joi'

import { publishEvent } from '~/src/server/messaging/publish-base.js'
import {
  publishSaveAndExitV1Event,
  publishSaveAndExitV2Event
} from '~/src/server/messaging/publish.js'

jest.mock('~/src/server/messaging/publish-base.js')

/**
 * @type {SaveAndExitMessageData}
 */
const saveAndExitPayload = {
  form: {
    id: 'formId',
    title: 'My First Form',
    isPreview: true,
    status: FormStatus.Draft,
    baseUrl: 'http://localhost:3009'
  },
  email: 'my-email@here.com',
  security: {
    question: SecurityQuestionsEnum.CharacterName,
    answer: 'brown'
  },
  state: {
    formVal1: '123',
    formVal2: '456'
  }
}

/**
 * @type {SaveAndExitV2MessageData}
 */
const saveAndExitPayloadv2 = {
  form: {
    id: 'formId',
    title: 'My First Form',
    isPreview: true,
    status: FormStatus.Draft,
    baseUrl: 'http://localhost:3009'
  },
  email: 'my-email@here.com',
  auth: {
    sub: 'auth-sub',
    issuer: 'auth-issuer'
  },
  state: {
    formVal1: '123',
    formVal2: '456'
  }
}

describe('publish', () => {
  beforeEach(() => {
    jest.mocked(publishEvent).mockResolvedValue({
      MessageId: '2888a402-7609-43c5-975f-b1974969cdb6',
      SequenceNumber: undefined,
      $metadata: {}
    })
  })
  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('publishSaveAndExitV1Event', () => {
    it('should publish SAVE_AND_EXIT V1 event', async () => {
      await publishSaveAndExitV1Event(
        saveAndExitPayload.form.id,
        saveAndExitPayload.form.title,
        saveAndExitPayload.email,
        saveAndExitPayload.security,
        saveAndExitPayload.state,
        saveAndExitPayload.form.status
      )

      expect(publishEvent).toHaveBeenCalledWith({
        source: SubmissionEventMessageSource.FORMS_RUNNER,
        messageCreatedAt: expect.any(Date),
        schemaVersion: SubmissionEventMessageSchemaVersion.V1,
        category: SubmissionEventMessageCategory.RUNNER,
        type: SubmissionEventMessageType.RUNNER_SAVE_AND_EXIT,
        createdAt: expect.any(Date),
        data: saveAndExitPayload
      })
    })

    it('should not publish the event if the schema is incorrect', async () => {
      jest.mocked(publishEvent).mockRejectedValue(new Error('rejected'))
      const invalidPayload = {}

      await expect(
        // @ts-expect-error - invalid schema
        publishSaveAndExitV1Event(invalidPayload)
      ).rejects.toThrow(
        new ValidationError(
          '"data.form.id" must be a string. "data.form.title" is required. "data.email" is required. "data.state" is required',
          [],
          {}
        )
      )
    })
  })

  describe('publishSaveAndExitV2Event', () => {
    const saveAndExitV2Payload = structuredClone(saveAndExitPayloadv2)

    it('should publish SAVE_AND_EXIT V2 event', async () => {
      await publishSaveAndExitV2Event(
        saveAndExitV2Payload.form.id,
        saveAndExitV2Payload.form.title,
        saveAndExitV2Payload.email,
        saveAndExitV2Payload.auth,
        saveAndExitV2Payload.state,
        saveAndExitV2Payload.form.status
      )

      expect(publishEvent).toHaveBeenCalledWith({
        source: SubmissionEventMessageSource.FORMS_RUNNER,
        messageCreatedAt: expect.any(Date),
        schemaVersion: SubmissionEventMessageSchemaVersion.V1,
        category: SubmissionEventMessageCategory.RUNNER,
        type: SubmissionEventMessageType.RUNNER_SAVE_AND_EXIT_V2,
        createdAt: expect.any(Date),
        data: saveAndExitV2Payload
      })
    })

    it('should not publish the event if the schema is incorrect', async () => {
      jest.mocked(publishEvent).mockRejectedValue(new Error('rejected'))
      const invalidPayload = {}

      await expect(
        // @ts-expect-error - invalid schema
        publishSaveAndExitV2Event(invalidPayload)
      ).rejects.toThrow(
        new ValidationError(
          '"data.form.id" must be a string. "data.form.title" is required. "data.email" is required. "data.state" is required',
          [],
          {}
        )
      )
    })
  })
})

/**
 * @import { SaveAndExitMessageData, SaveAndExitV2MessageData } from '@defra/forms-model'
 */
