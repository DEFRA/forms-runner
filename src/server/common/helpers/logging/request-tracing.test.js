import { getCorrelationId, getUserId } from '@defra/forms-common'
import { getTraceId } from '@defra/hapi-tracing'
import hapi from '@hapi/hapi'

import {
  getRequestUserId,
  requestTracing
} from '~/src/server/common/helpers/logging/request-tracing.js'

describe('request-tracing', () => {
  const tracingHeader = 'x-cdp-request-id'
  const correlationId = '1066e8cc-8e1e-4671-8ad7-b4cd9c95bb94'
  const userId = '86758ba9-92e7-4287-9751-7705e449f0a5'

  describe('plugin', () => {
    /** @type {Server} */
    let server

    /** @type {{ correlationId?: string, userId?: string }} */
    let responseContext

    beforeEach(async () => {
      server = hapi.server()
      responseContext = {}

      server.auth.scheme('test', () => ({
        authenticate(request, h) {
          return h.authenticated({
            credentials: /** @type {AuthCredentials} */ ({ sub: userId })
          })
        }
      }))
      server.auth.strategy('test', 'test')

      await server.register(requestTracing)

      const handler = () => ({
        correlationId: getCorrelationId(),
        traceId: getTraceId(),
        userId: getUserId()
      })

      server.route([
        { method: 'GET', path: '/open', handler },
        {
          method: 'GET',
          path: '/secure',
          handler,
          options: { auth: 'test' }
        }
      ])

      // The response log is written when this event is emitted
      server.events.on('response', () => {
        responseContext = {
          correlationId: getCorrelationId(),
          userId: getUserId()
        }
      })
    })

    afterEach(async () => {
      await server.stop()
    })

    it('should use the correlation ID from the tracing header', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/open',
        headers: { [tracingHeader]: correlationId }
      })

      expect(result).toEqual({
        correlationId,
        traceId: correlationId,
        userId: undefined
      })
      expect(responseContext).toEqual({ correlationId, userId: undefined })
    })

    it('should add the account ID of the signed in citizen', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/secure',
        headers: { [tracingHeader]: correlationId }
      })

      expect(result).toEqual({
        correlationId,
        traceId: correlationId,
        userId
      })
      expect(responseContext).toEqual({ correlationId, userId })
    })
  })

  describe('getRequestUserId', () => {
    /**
     * @param {boolean} isAuthenticated
     */
    function buildRequest(isAuthenticated) {
      return /** @type {Request} */ (
        /** @type {unknown} */ ({
          auth: {
            isAuthenticated,
            credentials: { sub: userId, email: 'citizen@example.com' }
          }
        })
      )
    }

    it('should return the sub of a signed in citizen', () => {
      expect(getRequestUserId(buildRequest(true))).toBe(userId)
    })

    it('should return undefined when the request is not authenticated', () => {
      expect(getRequestUserId(buildRequest(false))).toBeUndefined()
    })
  })
})

/**
 * @import { AuthCredentials, Request, Server } from '@hapi/hapi'
 */
