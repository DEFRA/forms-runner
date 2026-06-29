import { type AnyFormRequest } from '@defra/forms-engine-plugin/types'
import { type FormMetadata } from '@defra/forms-model'

import { t } from '~/src/server/i18n/index.js'
import { resolveLanguage } from '~/src/server/utils/utils.js'

describe('Runner i18n', () => {
  describe('t()', () => {
    it('returns the en-GB string for a known key', () => {
      expect(t('errors.notFound.heading', 'en-GB')).toBe('Page not found')
    })

    it('returns the x-pirate string for a known key', () => {
      expect(t('errors.notFound.heading', 'x-pirate')).toBe(
        'Page not found, arrr'
      )
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
    const request = {
      server: {
        plugins: {
          // eslint-disable-next-line no-useless-computed-key
          ['forms-engine-plugin']: {
            getLanguage: () => 'en-GB'
          }
        }
      }
    } as unknown as AnyFormRequest
    it('returns en-GB when no metadata is provided', () => {
      expect(resolveLanguage(request)).toBe('en-GB')
    })

    it('returns en-GB when metadata has no language field', () => {
      expect(resolveLanguage(request, {} as FormMetadata)).toBe('en-GB')
    })

    it('returns the language from metadata when present', () => {
      const metadata = { language: 'cy' } as unknown as FormMetadata
      const blankRequest = {} as unknown as AnyFormRequest
      expect(resolveLanguage(blankRequest, metadata)).toBe('cy')
    })
  })
})
