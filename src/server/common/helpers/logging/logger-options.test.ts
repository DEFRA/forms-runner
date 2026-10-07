import { createLogContext, runWithLogContext } from '@defra/forms-common'
import { type Logger } from 'pino'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options.js'

describe('logger-options', () => {
  const correlationId = '1066e8cc-8e1e-4671-8ad7-b4cd9c95bb94'
  const userId = '86758ba9-92e7-4287-9751-7705e449f0a5'

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
    it('returns an empty object outside of a log context', () => {
      const result = loggerOptions.mixin()
      expect(result).toEqual({})
    })

    it('includes the trace ID when available', () => {
      runWithLogContext(createLogContext({ correlationId }), () => {
        const result = loggerOptions.mixin()
        expect(result).toEqual({
          trace: {
            id: correlationId
          }
        })
      })
    })

    it('includes the user ID when available', () => {
      runWithLogContext(createLogContext({ correlationId, userId }), () => {
        const result = loggerOptions.mixin()
        expect(result).toEqual({
          trace: {
            id: correlationId
          },
          user: {
            id: userId
          }
        })
      })
    })
  })

  describe('logMethod hook', () => {
    it('writes the user ID into the message', () => {
      const logger = {} as Logger
      const method = jest.fn()

      runWithLogContext(createLogContext({ correlationId, userId }), () => {
        loggerOptions.hooks.logMethod.call(logger, ['message'], method)
      })

      expect(method).toHaveBeenCalledWith(`[uid:${userId}] message`)
    })
  })
})
