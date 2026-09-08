import { MAGIC_LINK_GROUP_ID } from '@defra/forms-engine-plugin'
import {
  FormStatus,
  SecurityQuestionsEnum,
  SubmissionEventMessageCategory,
  SubmissionEventMessageSchemaVersion,
  SubmissionEventMessageSource,
  SubmissionEventMessageType
} from '@defra/forms-model'

import {
  saveAndExitV1Mapper,
  saveAndExitV2Mapper
} from '~/src/server/messaging/mappers/events.js'

describe('runner-events', () => {
  describe('saveAndExitV1Mapper', () => {
    it('should map a payload into a SAVE_AND_EXIT V1 event', () => {
      /**
       * @type {SaveAndExitMessageData}
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
        saveAndExitV1Mapper(
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

    it('should map a payload into a SAVE_AND_EXIT V1 event with magicLinkGroupId', () => {
      /**
       * @type {SaveAndExitMessageData}
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
          formVal2: '456',
          [MAGIC_LINK_GROUP_ID]: 'group-id'
        }
      }

      expect(
        saveAndExitV1Mapper(
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
          state: payload.state,
          magicLinkGroupId: 'group-id'
        }
      })
    })
  })

  describe('saveAndExitV2Mapper', () => {
    it('should map a payload into a SAVE_AND_EXIT V2 event', () => {
      /**
       * @type {SaveAndExitV2MessageData}
       */
      const payload = {
        form: {
          id: 'formId',
          title: 'My First Form',
          isPreview: true,
          status: FormStatus.Draft,
          baseUrl: 'http://localhost:3009'
        },
        auth: {
          sub: 'auth-sub',
          issuer: 'auth-issuer'
        },
        state: {
          formVal1: '123',
          formVal2: '456'
        }
      }

      expect(
        saveAndExitV2Mapper(
          payload.form.id,
          payload.form.title,
          payload.auth,
          payload.state,
          payload.form.status
        )
      ).toEqual({
        schemaVersion: SubmissionEventMessageSchemaVersion.V1,
        category: SubmissionEventMessageCategory.RUNNER,
        source: SubmissionEventMessageSource.FORMS_RUNNER,
        type: SubmissionEventMessageType.RUNNER_SAVE_AND_EXIT_V2,
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
          auth: payload.auth,
          state: payload.state
        }
      })
    })
  })
})

/**
 * @import { SaveAndExitMessageData, SaveAndExitV2MessageData } from '@defra/forms-model'
 */
