import {
  createLogContext,
  getCorrelationId,
  getReferenceNumber,
  getSessionId,
  getUserId,
  runWithLogContext
} from '@defra/forms-common'
import { getTraceId } from '@defra/hapi-tracing'
import hapi from '@hapi/hapi'
import yar from '@hapi/yar'

import {
  addReferenceNumberToLogContext,
  getRequestSessionId,
  getRequestUserId,
  requestTracing
} from '~/src/server/common/helpers/logging/request-tracing.js'

describe('request-tracing', () => {
  const tracingHeader = 'x-cdp-request-id'
  const correlationId = '1066e8cc-8e1e-4671-8ad7-b4cd9c95bb94'
  const userId = '86758ba9-92e7-4287-9751-7705e449f0a5'
  const sessionId = 'c3a2e5f4-2b8e-4e1f-9a8d-3f6b7c1d2e9a'
  const referenceNumber = 'ABC-123-DEF'

  describe('plugin', () => {
    /** @type {Server} */
    let server

    /** @type {{ correlationId?: string, userId?: string, sessionId?: string }} */
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

      // Registered after the request tracing plugin, as in the server, which
      // must still read the session ID once yar has loaded the session
      await server.register({
        plugin: yar,
        options: {
          cookieOptions: { password: 'a'.repeat(32), isSecure: false },
          customSessionIDGenerator: () => sessionId
        }
      })

      const handler = () => ({
        correlationId: getCorrelationId(),
        traceId: getTraceId(),
        userId: getUserId(),
        sessionId: getSessionId()
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
          userId: getUserId(),
          sessionId: getSessionId()
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
        userId: undefined,
        sessionId
      })
      expect(responseContext).toEqual({
        correlationId,
        userId: undefined,
        sessionId
      })
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
        userId,
        sessionId
      })
      expect(responseContext).toEqual({ correlationId, userId, sessionId })
    })
  })

  describe('getRequestSessionId', () => {
    it('should return the ID of the yar session', () => {
      const request = /** @type {Request} */ (
        /** @type {unknown} */ ({ yar: { id: sessionId } })
      )

      expect(getRequestSessionId(request)).toBe(sessionId)
    })

    it('should return undefined when yar is not registered', () => {
      const request = /** @type {Request} */ (/** @type {unknown} */ ({}))

      expect(getRequestSessionId(request)).toBeUndefined()
    })
  })

  describe('addReferenceNumberToLogContext', () => {
    const request = /** @type {AnyFormRequest} */ (/** @type {unknown} */ ({}))
    const h = /** @type {FormResponseToolkit} */ (
      /** @type {unknown} */ ({ continue: Symbol('continue') })
    )
    const context = /** @type {FormContext} */ (
      /** @type {unknown} */ ({ referenceNumber })
    )

    it('should add the reference number of the form to the log context', () => {
      runWithLogContext(createLogContext(), () => {
        const result = addReferenceNumberToLogContext(request, h, context)

        expect(result).toBe(h.continue)
        expect(getReferenceNumber()).toBe(referenceNumber)
      })
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
 * @import { AnyFormRequest, FormContext, FormResponseToolkit } from '@defra/forms-engine-plugin/types'
 * @import { AuthCredentials, Request, Server } from '@hapi/hapi'
 */
