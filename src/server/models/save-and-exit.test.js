import { lockedOutViewModel } from '~/src/server/models/save-and-exit.js'

const formId = '6c45dbc1-d6bb-4d30-8d68-2e708e5310b9'

describe('Save and exit models', () => {
  describe('lockedOutViewModel', () => {
    const form = /** @type {FormMetadata} */ ({
      title: 'My Form Title',
      slug: 'my-form',
      id: formId
    })

    const mockTranslator = {
      language: 'en-GB',
      t: function () {
        throw new Error('Function not implemented.')
      },
      tForm: function () {
        throw new Error('Function not implemented.')
      },
      tPage: function () {
        throw new Error('Function not implemented.')
      },
      tComponent: function () {
        throw new Error('Function not implemented.')
      },
      tSection: function () {
        throw new Error('Function not implemented.')
      },
      tListItem: function () {
        throw new Error('Function not implemented.')
      }
    }

    test('should construct live resume url', () => {
      const link = /** @type {SaveAndExitResumeDetails} */ ({
        form: {
          isPreview: false,
          status: 'live'
        }
      })
      expect(lockedOutViewModel(form, link, 5, mockTranslator)).toEqual({
        name: 'My Form Title',
        maxPasswordAttempts: 5,
        buttons: {
          continueButton: {
            text: 'Start form again',
            href: '/form/my-form'
          }
        },
        context: { translator: expect.any(Object) },
        feedbackLink:
          '/form/feedback?formId=6c45dbc1-d6bb-4d30-8d68-2e708e5310b9'
      })
    })

    test('should construct preview live resume url', () => {
      const link = /** @type {SaveAndExitResumeDetails} */ ({
        form: {
          isPreview: true,
          status: 'live'
        }
      })
      expect(lockedOutViewModel(form, link, 5, mockTranslator)).toEqual({
        name: 'My Form Title',
        maxPasswordAttempts: 5,
        buttons: {
          continueButton: {
            text: 'Start form again',
            href: '/form/preview/live/my-form'
          }
        },
        context: { translator: expect.any(Object) },
        feedbackLink:
          '/form/feedback?formId=6c45dbc1-d6bb-4d30-8d68-2e708e5310b9'
      })
    })

    test('should construct preview draft resume url', () => {
      const link = /** @type {SaveAndExitResumeDetails} */ ({
        form: {
          isPreview: true,
          status: 'draft'
        }
      })
      expect(lockedOutViewModel(form, link, 5, mockTranslator)).toEqual({
        name: 'My Form Title',
        maxPasswordAttempts: 5,
        buttons: {
          continueButton: {
            text: 'Start form again',
            href: '/form/preview/draft/my-form'
          }
        },
        context: { translator: expect.any(Object) },
        feedbackLink:
          '/form/feedback?formId=6c45dbc1-d6bb-4d30-8d68-2e708e5310b9'
      })
    })
  })
})

/**
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { SaveAndExitResumeDetails } from '~/src/server/types.js'
 */
