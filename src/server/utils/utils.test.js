import { getTraceId } from '@defra/hapi-tracing'

import { config } from '~/src/config/index.js'
import {
  applyTraceHeaders,
  getCallingPath,
  getFeedbackFormLink
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

  describe('getCallingPath', () => {
    it('should return path', () => {
      const mockRequest = { headers: { referer: 'http:/my-site.com/my-path' } }
      expect(getCallingPath(mockRequest)).toBe('/my-path')
    })
  })
})
