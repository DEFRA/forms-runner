import Boom from '@hapi/boom'
import hapi from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'

import { SignInRequiredError } from '~/src/server/auth/SignInRequiredError.js'
import { refreshAccessToken } from '~/src/server/auth/accessToken.js'
import {
  clearIdentity,
  getIdentity,
  getTokens,
  setTokens
} from '~/src/server/auth/accountSession.js'
import { hasBeenLoggedOut } from '~/src/server/auth/backchannelLogout.js'
import { CITIZEN_SESSION } from '~/src/server/auth/scheme.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import pluginAuth from '~/src/server/plugins/auth.js'

jest.mock('~/src/server/auth/accountSession.js')
jest.mock('~/src/server/auth/backchannelLogout.js')
jest.mock('~/src/server/auth/accessToken.js', () => ({
  ...jest.requireActual('~/src/server/auth/accessToken.js'),
  refreshAccessToken: jest.fn()
}))

const identity = {
  iss: 'http://localhost:3011',
  sub: '0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0',
  email: 'citizen@example.com'
}

/**
 * The citizen's tokens, with an access token that has the given number of
 * seconds left
 */
function tokenSet(secondsLeft: number) {
  return {
    accessToken: 'access-1',
    accessTokenExpiresAt: Date.now() + secondsLeft * 1000,
    refreshToken: 'refresh-1',
    idToken: 'header.payload.signature'
  }
}

/**
 * Registers an endpoint that reports what `request.auth` holds, which is what
 * the strategy decides.
 */
function setupProbeEndpoint(server: hapi.Server, path = '/probe') {
  server.route({
    method: 'GET',
    path,
    handler: (request) => ({
      isAuthenticated: request.auth.isAuthenticated,
      credentials: request.auth.credentials
    })
  })
}

/**
 * Registers a probe endpoint that requires sign in, as the homepage routes
 * declare it.
 */
function setupRequiredEndpoint(server: hapi.Server, path = '/secure') {
  server.route({
    method: 'GET',
    path,
    options: {
      auth: { mode: 'required', strategy: CITIZEN_SESSION }
    },
    handler: (request) => ({
      isAuthenticated: request.auth.isAuthenticated,
      credentials: request.auth.credentials
    })
  })
}

describe('citizen-session strategy', () => {
  beforeEach(() => {
    jest.mocked(getTokens).mockReturnValue(tokenSet(300))
    jest.spyOn(logger, 'error').mockImplementation(() => undefined)
  })

  it('leaves an anonymous request unauthenticated rather than rejecting it', async () => {
    jest.mocked(getIdentity).mockReturnValue(null)

    const server = hapi.server()
    await server.register(pluginAuth)
    setupProbeEndpoint(server)

    const response = await server.inject({ method: 'GET', url: '/probe' })

    expect(response.statusCode).toBe(StatusCodes.OK)
    expect(response.result).toMatchObject({ isAuthenticated: false })
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('puts the stored identity and tokens on the request', async () => {
    const tokens = tokenSet(300)
    jest.mocked(getIdentity).mockReturnValue(identity)
    jest.mocked(getTokens).mockReturnValue(tokens)

    const server = hapi.server()
    await server.register(pluginAuth)
    setupProbeEndpoint(server)

    const response = await server.inject({ method: 'GET', url: '/probe' })

    expect(response.result).toEqual({
      isAuthenticated: true,
      credentials: { ...identity, ...tokens }
    })
    expect(refreshAccessToken).not.toHaveBeenCalled()
  })

  it('redirects an anonymous request on a required route to sign in, returning to the same path', async () => {
    jest.mocked(getIdentity).mockReturnValue(null)

    const server = hapi.server()
    await server.register(pluginAuth)
    setupRequiredEndpoint(server)

    const response = await server.inject({ method: 'GET', url: '/secure' })

    expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe('/auth/sign-in?returnUrl=%2Fsecure')
  })

  it('serves a required route when signed in', async () => {
    jest.mocked(getIdentity).mockReturnValue(identity)

    const server = hapi.server()
    await server.register(pluginAuth)
    setupRequiredEndpoint(server)

    const response = await server.inject({ method: 'GET', url: '/secure' })

    expect(response.statusCode).toBe(StatusCodes.OK)
    expect(response.result).toMatchObject({
      isAuthenticated: true,
      credentials: { email: 'citizen@example.com' }
    })
  })

  it('applies to routes registered before it, so plugin routes are covered too', async () => {
    jest.mocked(getIdentity).mockReturnValue(identity)

    const server = hapi.server()
    setupProbeEndpoint(server, '/registered-first')

    await server.register(pluginAuth)

    const response = await server.inject({
      method: 'GET',
      url: '/registered-first'
    })

    expect(response.result).toMatchObject({ isAuthenticated: true })
  })

  it('does not run on a route that sets auth to false', async () => {
    jest.mocked(getIdentity).mockReturnValue(identity)
    jest.mocked(getTokens).mockReturnValue(tokenSet(0))

    const server = hapi.server()
    await server.register(pluginAuth)
    server.route({
      method: 'GET',
      path: '/asset',
      options: { auth: false },
      handler: () => null
    })

    await server.inject({ method: 'GET', url: '/asset' })

    expect(getIdentity).not.toHaveBeenCalled()
    expect(refreshAccessToken).not.toHaveBeenCalled()
  })

  it('does not log a strategy that rejects the credentials', async () => {
    const server = hapi.server()
    await server.register(pluginAuth)
    server.auth.scheme('rejecting', () => ({
      authenticate: () => {
        throw Boom.unauthorized('Invalid credentials')
      }
    }))
    server.auth.strategy('rejecting', 'rejecting')
    server.route({
      method: 'GET',
      path: '/rejecting',
      options: { auth: { mode: 'try', strategy: 'rejecting' } },
      handler: (request) => ({ isAuthenticated: request.auth.isAuthenticated })
    })

    const response = await server.inject({ method: 'GET', url: '/rejecting' })

    expect(response.result).toEqual({ isAuthenticated: false })
    expect(logger.error).not.toHaveBeenCalled()
  })

  describe('when the session cannot be checked', () => {
    beforeEach(() => {
      jest
        .mocked(getIdentity)
        .mockReturnValue({ ...identity, sid: 'session-1' })
      jest
        .mocked(hasBeenLoggedOut)
        .mockRejectedValue(new Error('Redis unavailable'))
    })

    it('logs the error and leaves the request unauthenticated', async () => {
      const server = hapi.server()
      await server.register(pluginAuth)
      setupProbeEndpoint(server)

      const response = await server.inject({ method: 'GET', url: '/probe' })

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.result).toMatchObject({ isAuthenticated: false })
      expect(logger.error).toHaveBeenCalledWith(
        '[authFailed] citizen-session could not authenticate the request - Redis unavailable'
      )
    })
  })

  describe('when the access token is about to expire', () => {
    beforeEach(() => {
      jest.mocked(getIdentity).mockReturnValue(identity)
      jest.mocked(getTokens).mockReturnValue(tokenSet(20))
    })

    it('refreshes it, saves the new tokens and puts the new one on the request', async () => {
      const refreshed = { ...tokenSet(300), accessToken: 'access-2' }
      jest.mocked(refreshAccessToken).mockResolvedValue(refreshed)

      const server = hapi.server()
      await server.register(pluginAuth)
      setupProbeEndpoint(server)

      const response = await server.inject({ method: 'GET', url: '/probe' })

      expect(refreshAccessToken).toHaveBeenCalledWith(
        expect.anything(),
        identity.sub,
        expect.objectContaining({ refreshToken: 'refresh-1' })
      )
      expect(response.result).toEqual({
        isAuthenticated: true,
        credentials: { ...identity, ...refreshed }
      })
      expect(setTokens).toHaveBeenCalledTimes(1)
      expect(jest.mocked(setTokens).mock.calls[0][1]).toBe(refreshed)
    })

    it('keeps a token that has not yet expired when the provider could not refresh it', async () => {
      jest.mocked(refreshAccessToken).mockResolvedValue(undefined)

      const server = hapi.server()
      await server.register(pluginAuth)
      setupProbeEndpoint(server)

      const response = await server.inject({ method: 'GET', url: '/probe' })

      expect(response.result).toMatchObject({
        isAuthenticated: true,
        credentials: { email: 'citizen@example.com', accessToken: 'access-1' }
      })
      expect(setTokens).not.toHaveBeenCalled()
      expect(clearIdentity).not.toHaveBeenCalled()
    })

    describe('and the token has expired and the provider could not refresh it', () => {
      beforeEach(() => {
        jest.mocked(getTokens).mockReturnValue(tokenSet(-10))
        jest.mocked(refreshAccessToken).mockResolvedValue(undefined)
      })

      it('leaves the request unauthenticated and keeps the session', async () => {
        const server = hapi.server()
        await server.register(pluginAuth)
        setupProbeEndpoint(server)

        const response = await server.inject({ method: 'GET', url: '/probe' })

        expect(response.statusCode).toBe(StatusCodes.OK)
        expect(response.result).toMatchObject({ isAuthenticated: false })
        expect(setTokens).not.toHaveBeenCalled()
        expect(clearIdentity).not.toHaveBeenCalled()
        expect(logger.error).toHaveBeenCalledWith(
          '[authFailed] citizen-session could not authenticate the request - Could not refresh an expired access token'
        )
      })

      it('answers service unavailable on a required route', async () => {
        const server = hapi.server()
        await server.register(pluginAuth)
        setupRequiredEndpoint(server)

        const response = await server.inject({ method: 'GET', url: '/secure' })

        expect(response.statusCode).toBe(StatusCodes.SERVICE_UNAVAILABLE)
        expect(clearIdentity).not.toHaveBeenCalled()
      })
    })

    describe('and the citizen must sign in again', () => {
      beforeEach(() => {
        jest
          .mocked(refreshAccessToken)
          .mockRejectedValue(new SignInRequiredError('invalidGrant'))
      })

      it('signs the citizen out and leaves the request unauthenticated', async () => {
        const server = hapi.server()
        await server.register(pluginAuth)
        setupProbeEndpoint(server)

        const response = await server.inject({ method: 'GET', url: '/probe' })

        expect(response.statusCode).toBe(StatusCodes.OK)
        expect(response.result).toMatchObject({ isAuthenticated: false })
        expect(clearIdentity).toHaveBeenCalledTimes(1)
        expect(setTokens).not.toHaveBeenCalled()
      })

      it('redirects a required route to sign in, returning to the same path', async () => {
        const server = hapi.server()
        await server.register(pluginAuth)
        setupRequiredEndpoint(server)

        const response = await server.inject({ method: 'GET', url: '/secure' })

        expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect(response.headers.location).toBe(
          '/auth/sign-in?returnUrl=%2Fsecure'
        )
      })
    })
  })
})
