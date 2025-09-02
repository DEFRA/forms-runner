import {
  FormStatus,
  SecurityQuestionsEnum,
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
          question: SecurityQuestionsEnum.CharacterName,
          answer: 'brown'
        },
        formStatus: {
          status: FormStatus.Draft,
          isPreview: false
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
          payload.formStatus,
          payload.state
        )
      ).toEqual({
        schemaVersion: SubmissionEventMessageSchemaVersion.V1,
        category: SubmissionEventMessageCategory.RUNNER,
        source: SubmissionEventMessageSource.FORMS_RUNNER,
        type: SubmissionEventMessageType.RUNNER_SAVE_AND_EXIT,
        createdAt: expect.any(Date),
        messageCreatedAt: expect.any(Date),
        data: {
          formId: payload.formId,
          email: payload.email,
          security: {
            question: payload.security.question,
            answer: payload.security.answer
          },
          formStatus: {
            status: payload.formStatus.status,
            isPreview: payload.formStatus.isPreview
          },
          state: payload.state
        }
      })
    })
  })
})
