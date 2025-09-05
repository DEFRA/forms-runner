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
import { publishSaveAndExitEvent } from '~/src/server/messaging/publish.js'

jest.mock('~/src/server/messaging/publish-base.js')

/**
 * @type {import('@defra/forms-model').SaveAndExitMessageData}
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

  describe('publishSaveAndExitEvent', () => {
    it('should publish SAVE_AND_EXIT event', async () => {
      await publishSaveAndExitEvent(
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
        publishSaveAndExitEvent(invalidPayload)
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
