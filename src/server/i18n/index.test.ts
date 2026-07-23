import { type FormDefinition } from '@defra/forms-model'
import { type Request } from '@hapi/hapi'
import { type i18n } from 'i18next'

import { EN_GB } from '~/src/server/constants.js'
import { extractTranslations, t } from '~/src/server/i18n/index.js'
import { resolveLanguage } from '~/src/server/utils/utils.js'

describe('Runner i18n', () => {
  describe('t()', () => {
    it('returns the en-GB string for a known key', () => {
      expect(t('errors.notFound.heading', 'en-GB')).toBe('Page not found')
    })

    it('falls back to en-GB for an unknown language', () => {
      expect(t('errors.notFound.heading', 'unkno')).toBe('Page not found')
    })

    it('interpolates values into the string', () => {
      expect(
        t('saveAndExit.resumeErrorLocked.incorrectAnswer', 'en-GB', {
          maxPasswordAttempts: 5
        })
      ).toBe(
        'The answer to your security question was incorrect 5 times. You have run out of attempts to resume your form.'
      )
    })
  })

  describe('resolveLanguage()', () => {
    it('returns the default language', () => {
      const blankRequest = {} as unknown as Request
      expect(resolveLanguage(blankRequest.query, blankRequest.yar)).toBe(EN_GB)
    })

    it('returns the language set in the session', () => {
      const blankRequest = {
        yar: {
          get: jest.fn().mockReturnValue('cy')
        }
      } as unknown as Request
      expect(resolveLanguage(blankRequest.query, blankRequest.yar)).toBe('cy')
    })

    it('should set the language if passed as a param', () => {
      const mockYarSet = jest.fn()
      const blankRequest = {
        yar: {
          get: jest.fn(),
          set: mockYarSet
        },
        query: {
          language: 'cy'
        }
      } as unknown as Request
      resolveLanguage(blankRequest.query, blankRequest.yar)
      expect(mockYarSet).toHaveBeenCalledWith('language', 'cy')
    })
  })

  describe('extractTranslations()', () => {
    it('ignores if no translations', () => {
      const mockAddResourceBundle = jest.fn()
      const mockInstance = {
        addResourceBundle: mockAddResourceBundle
      } as unknown as i18n
      const definition = undefined as unknown as FormDefinition
      extractTranslations(definition, mockInstance)
      expect(mockInstance.addResourceBundle).not.toHaveBeenCalled()
    })

    it('call addResourceBundle for each set of translations', () => {
      const mockAddResourceBundle = jest.fn()
      const mockInstance = {
        addResourceBundle: mockAddResourceBundle
      } as unknown as i18n
      const definition = {
        metadata: {
          translations: {
            cy: {
              abc: 'def'
            },
            de: {
              ghi: 'jkl'
            }
          }
        }
      } as unknown as FormDefinition
      extractTranslations(definition, mockInstance)
      expect(mockInstance.addResourceBundle).toHaveBeenCalledTimes(2)
      expect(mockInstance.addResourceBundle).toHaveBeenNthCalledWith(
        1,
        'cy',
        'form',
        { abc: 'def' },
        true,
        true
      )
    })
  })
})
