import {
  SubmissionEventMessageCategory,
  SubmissionEventMessageSchemaVersion,
  SubmissionEventMessageSource,
  SubmissionEventMessageType
} from '@defra/forms-model'

import { saveAndExitMapper } from '~/src/server/messaging/mappers/events.js'

describe('runner-events', () => {
  describe('saveAndExitMapper', () => {
    it('should map a payload into a SAVE_AND_EXIT event', () => {
      const payload = {
        formId: 'formId',
        email: 'my-email@here.com',
        security: {
          question: 'q3',
          answer: 'brown'
        },
        state: {
          formVal1: '123',
          formVal2: '456'
        }
      }
      expect(
        saveAndExitMapper(
          payload.formId,
          payload.email,
          payload.security,
          payload.state
        )
      ).toEqual({
        schemaVersion: SubmissionEventMessageSchemaVersion.V1,
        category: SubmissionEventMessageCategory.RUNNER,
        source: SubmissionEventMessageSource.FORMS_RUNNER,
        type: SubmissionEventMessageType.RUNNER_SAVE_AND_EXIT,
        entityId: expect.any(String),
        createdAt: expect.any(Date),
        messageCreatedAt: expect.any(Date),
        data: {
          formId: payload.formId,
          email: payload.email,
          security: {
            question: payload.security.question,
            answer: payload.security.answer
          },
          state: payload.state
        }
      })
    })
  })
})
