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
      /**
       * @type {import('@defra/forms-model').SaveAndExitMessageData}
       */
      const payload = {
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

      expect(
        saveAndExitMapper(
          payload.form.id,
          payload.form.title,
          payload.email,
          payload.security,
          payload.state,
          payload.form.status
        )
      ).toEqual({
        schemaVersion: SubmissionEventMessageSchemaVersion.V1,
        category: SubmissionEventMessageCategory.RUNNER,
        source: SubmissionEventMessageSource.FORMS_RUNNER,
        type: SubmissionEventMessageType.RUNNER_SAVE_AND_EXIT,
        createdAt: expect.any(Date),
        messageCreatedAt: expect.any(Date),
        data: {
          form: {
            id: payload.form.id,
            title: payload.form.title,
            isPreview: payload.form.isPreview,
            status: payload.form.status,
            baseUrl: 'http://localhost:3009'
          },
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
