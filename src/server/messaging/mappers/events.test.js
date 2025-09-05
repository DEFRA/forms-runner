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
          title: 'formId',
          slug: 'my-form',
          isPreview: true,
          status: FormStatus.Draft
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
          payload.form.slug,
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
            slug: payload.form.slug,
            isPreview: payload.form.isPreview,
            status: payload.form.status
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
