import { getTraceId } from '@defra/hapi-tracing'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options.js'

jest.mock('@defra/hapi-tracing', () => ({
  getTraceId: jest.fn()
}))

describe('logger-options', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('configuration', () => {
    it('has the expected properties', () => {
      expect(loggerOptions).toHaveProperty('enabled')
      expect(loggerOptions).toHaveProperty('ignorePaths')
      expect(loggerOptions).toHaveProperty('redact')
      expect(loggerOptions).toHaveProperty('level')
    })

    it('ignores health endpoint', () => {
      expect(loggerOptions.ignorePaths).toContain('/health')
    })

    it('has redaction configuration', () => {
      expect(loggerOptions.redact).toBeDefined()
    })
  })

  describe('mixin function', () => {
    it('returns an empty object when no trace ID is available', () => {
      jest.mocked(getTraceId).mockReturnValue(null)

      const result = loggerOptions.mixin()
      expect(result).toEqual({})
    })

    it('includes trace ID when available', () => {
      jest.mocked(getTraceId).mockReturnValue('some-trace-id')

      const result = loggerOptions.mixin()
      expect(result).toEqual({
        trace: {
          id: 'some-trace-id'
        }
      })
    })
  })
})
