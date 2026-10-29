import { addLogContextToMessage, logContextMixin } from '@defra/forms-common'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options.js'

describe('logger-options', () => {
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

    it('uses the forms-common log context mixin', () => {
      expect(loggerOptions.mixin).toBe(logContextMixin)
    })

    it('uses the forms-common log message hook', () => {
      expect(loggerOptions.hooks.logMethod).toBe(addLogContextToMessage)
    })
  })
})
