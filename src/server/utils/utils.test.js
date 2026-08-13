import { getTraceId } from '@defra/hapi-tracing'

import { config } from '~/src/config/index.js'
import {
  applyTraceHeaders,
  getFeedbackFormLink,
  resolveLanguage
} from '~/src/server/utils/utils.js'

jest.mock('@defra/hapi-tracing')

describe('utils', () => {
  describe('Header helper functions', () => {
    it('should include the trace id in the headers if available', () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')

      const result = applyTraceHeaders() // Updated to applyTraceHeaders
      expect(result).toEqual({
        [config.get('tracing').header]: 'my-trace-id'
      })
    })

    it('should exclude the trace id in the headers if missing', () => {
      jest.mocked(getTraceId).mockReturnValue(null)

      const result = applyTraceHeaders() // Updated to applyTraceHeaders
      expect(result).toBeUndefined()
    })

    it('should merge existing headers with the trace id if available', () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')

      const existingHeaders = { Authorization: 'Bearer token' }
      const result = applyTraceHeaders(existingHeaders) // Updated to applyTraceHeaders

      expect(result).toEqual({
        Authorization: 'Bearer token',
        [config.get('tracing').header]: 'my-trace-id'
      })
    })

    it('should return existing headers without modification if trace id is missing', () => {
      jest.mocked(getTraceId).mockReturnValue(null)

      const existingHeaders = { Authorization: 'Bearer token' }
      const result = applyTraceHeaders(existingHeaders) // Updated to applyTraceHeaders

      expect(result).toEqual({
        Authorization: 'Bearer token'
      })
    })

    it('should return existing headers if tracing header configuration is missing', () => {
      const existingHeaders = { Authorization: 'Bearer token' }
      const result = applyTraceHeaders(existingHeaders, '')

      expect(result).toBe(existingHeaders)
    })
  })

  describe('feedbackLink', () => {
    it('should return feedback link', () => {
      expect(getFeedbackFormLink('source-form-id')).toEqual({
        feedbackLink: '/form/feedback?formId=source-form-id'
      })
    })
  })

  describe('resolveLanguage', () => {
    const mockYarStore = /** @type {Record<string,string>} */ ({})
    /**
     * @param {string} name
     * @param {string} value
     */
    function yarSet(name, value) {
      mockYarStore[name] = value
    }
    /**
     * @param {string} name
     */
    function yarGet(name) {
      return mockYarStore[name]
    }

    it('should return default language if yar session not properly constructed yet', () => {
      expect(resolveLanguage({}, undefined)).toBe('en-GB')
    })

    it('should return specified language if yar session up and language passed as query param', () => {
      // @ts-expect-error - partial mock of methods
      expect(
        resolveLanguage(
          { language: 'cy' },
          { id: 'session-id', set: yarSet, get: yarGet }
        )
      ).toBe('cy')

      // Should retrieve session value when language not passed
      // @ts-expect-error - partial mock of methods
      expect(
        resolveLanguage({}, { id: 'session-id', set: yarSet, get: yarGet })
      ).toBe('cy')
    })
  })
})
