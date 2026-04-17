import  { type FormMetadata } from '@defra/forms-model'

import { resolveLanguage, t } from '~/src/server/i18n/index.js'

describe('Runner i18n', () => {
  describe('t()', () => {
    it('returns the en-GB string for a known key', () => {
      expect(t('errors.notFound.heading', 'en-GB')).toBe('Page not found')
    })

    it('falls back to en-GB for an unknown language', () => {
      expect(t('errors.notFound.heading', 'cy')).toBe('Page not found')
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
    it('returns en-GB when no metadata is provided', () => {
      expect(resolveLanguage()).toBe('en-GB')
    })

    it('returns en-GB when metadata has no language field', () => {
      expect(resolveLanguage({} as FormMetadata)).toBe('en-GB')
    })

    it('returns the language from metadata when present', () => {
      const metadata = { language: 'cy' } as unknown as FormMetadata
      expect(resolveLanguage(metadata)).toBe('cy')
    })
  })
})
