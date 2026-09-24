import Boom from '@hapi/boom'
import * as client from 'openid-client'

import { SignInRequiredError } from '~/src/server/auth/SignInRequiredError.js'
import { getAccessToken } from '~/src/server/auth/accessToken.js'
import {
  CITIZEN_KEY,
  TOKENS_KEY,
  getIdentity,
  getTokens
} from '~/src/server/auth/accountSession.js'

jest.mock('openid-client', () => ({
  ...jest.requireActual('openid-client'),
  refreshTokenGrant: jest.fn()
}))

const NOW = new Date('2026-09-16T09:00:00.000Z')
const SUB = 'sub-1'
const RESOURCE = 'urn:defra:forms:forms-submission-api'
const OIDC_CONFIG = /** @type {client.Configuration} */ ({})

/**
 * A request as the citizen-session scheme presents it, with tokens in the
 * session whose access token has the given number of seconds left
 * @param {number} secondsLeft
 */
function signedInRequest(secondsLeft) {
  /** @type {Map<string, unknown>} */
  const values = new Map([
    [CITIZEN_KEY, { iss: 'http://localhost:3011', sub: SUB }],
    [
      TOKENS_KEY,
      {
        accessToken: 'access-old',
        accessTokenExpiresAt: Date.now() + secondsLeft * 1000,
        refreshToken: 'refresh-old',
        idToken: 'id-old'
      }
    ]
  ])

  return /** @type {Request} */ (
    /** @type {unknown} */ ({
      auth: {
        isAuthenticated: true,
        credentials: {
          iss: 'http://localhost:3011',
          sub: SUB,
          email: 'citizen@example.com'
        }
      },
      yar: {
        get: jest.fn((/** @type {string} */ key) => values.get(key)),
        set: jest.fn(
          (/** @type {string} */ key, /** @type {unknown} */ value) =>
            values.set(key, value)
        ),
        clear: jest.fn((/** @type {string} */ key) => values.delete(key))
      },
      server: {
        app: { oidc: { getConfig: jest.fn().mockResolvedValue(OIDC_CONFIG) } }
      }
    })
  )
}

/**
 * A refresh response as openid-client returns it
 * @param {Partial<TokenEndpointResponse>} [overrides]
 * @param {string} [sub] - the subject the ID token names
 */
function refreshResponse(overrides = {}, sub = SUB) {
  const response = {
    access_token: 'access-new',
    id_token: 'id-new',
    expires_in: 300,
    token_type: 'bearer',
    ...overrides
  }

  return /** @type {TokenEndpointResponse & TokenEndpointResponseHelpers} */ (
    /** @type {unknown} */ ({
      ...response,
      claims: () => (response.id_token ? { sub } : undefined)
    })
  )
}

/**
 * The error openid-client raises for an OAuth error response
 * @param {string} error
 */
function responseBodyError(error) {
  return new client.ResponseBodyError('server responded with an error', {
    cause: { error },
    response: new Response(null, { status: 400 })
  })
}

/**
 * @param {Request} request
 */
function signedOut(request) {
  return getIdentity(request.yar) === null && getTokens(request.yar) === null
}

describe('getAccessToken', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, advanceTimers: true })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns a token with more than the grace period left, without refreshing', async () => {
    const request = signedInRequest(31)

    await expect(getAccessToken(request)).resolves.toBe('access-old')
    expect(client.refreshTokenGrant).not.toHaveBeenCalled()
  })

  it.each([30, 10, -60])(
    'refreshes a token with %i seconds left and saves the new tokens in the session',
    async (secondsLeft) => {
      jest.mocked(client.refreshTokenGrant).mockResolvedValue(refreshResponse())
      const request = signedInRequest(secondsLeft)

      await expect(getAccessToken(request)).resolves.toBe('access-new')

      const saved = getTokens(request.yar)
      expect(saved).toEqual({
        accessToken: 'access-new',
        accessTokenExpiresAt: expect.any(Number),
        refreshToken: 'refresh-old',
        idToken: 'id-new'
      })

      const expiresIn = (saved?.accessTokenExpiresAt ?? 0) - Date.now()
      expect(expiresIn).toBeGreaterThan(299_000)
      expect(expiresIn).toBeLessThanOrEqual(300_000)
    }
  )

  it('sends the refresh token and names the API the token is for', async () => {
    jest.mocked(client.refreshTokenGrant).mockResolvedValue(refreshResponse())
    const request = signedInRequest(0)

    await getAccessToken(request)

    expect(client.refreshTokenGrant).toHaveBeenCalledWith(
      OIDC_CONFIG,
      'refresh-old',
      { resource: RESOURCE }
    )
  })

  it('keeps the current ID token when the response has none', async () => {
    jest
      .mocked(client.refreshTokenGrant)
      .mockResolvedValue(refreshResponse({ id_token: undefined }))
    const request = signedInRequest(0)

    await expect(getAccessToken(request)).resolves.toBe('access-new')

    expect(getTokens(request.yar)).toMatchObject({
      accessToken: 'access-new',
      refreshToken: 'refresh-old',
      idToken: 'id-old'
    })
  })

  it('saves a refresh token the response carries', async () => {
    jest
      .mocked(client.refreshTokenGrant)
      .mockResolvedValue(refreshResponse({ refresh_token: 'refresh-new' }))
    const request = signedInRequest(0)

    await getAccessToken(request)

    expect(getTokens(request.yar)).toMatchObject({
      refreshToken: 'refresh-new'
    })
  })

  describe('when the provider refuses the refresh token', () => {
    it('removes the tokens and the identity, and asks the citizen to sign in', async () => {
      jest
        .mocked(client.refreshTokenGrant)
        .mockRejectedValue(responseBodyError('invalid_grant'))
      const request = signedInRequest(0)

      await expect(getAccessToken(request)).rejects.toBeInstanceOf(
        SignInRequiredError
      )
      expect(signedOut(request)).toBe(true)
    })

    it('treats an ID token for a different citizen the same way', async () => {
      jest
        .mocked(client.refreshTokenGrant)
        .mockResolvedValue(refreshResponse({}, 'someone-else'))
      const request = signedInRequest(0)

      await expect(getAccessToken(request)).rejects.toBeInstanceOf(
        SignInRequiredError
      )
      expect(signedOut(request)).toBe(true)
    })
  })

  describe('when the refresh fails for another reason', () => {
    it.each([
      ['a network failure', new TypeError('fetch failed')],
      ['a provider error', responseBodyError('server_error')],
      ['a value that is not an error', 'unexpected']
    ])(
      'keeps the tokens and identity after %s, and answers 503',
      async (_case, error) => {
        jest.mocked(client.refreshTokenGrant).mockRejectedValue(error)
        const request = signedInRequest(0)

        const thrown = await getAccessToken(request).catch(
          (/** @type {unknown} */ err) => err
        )

        expect(Boom.isBoom(thrown, 503)).toBe(true)
        expect(getTokens(request.yar)).toMatchObject({
          refreshToken: 'refresh-old'
        })
        expect(signedOut(request)).toBe(false)
      }
    )
  })

  describe('when the refresh response is incomplete', () => {
    it.each([
      ['no access token', { access_token: undefined }],
      ['no expiry', { expires_in: undefined }]
    ])(
      'keeps the tokens and identity when it has %s, and answers 503',
      async (_case, overrides) => {
        jest
          .mocked(client.refreshTokenGrant)
          .mockResolvedValue(refreshResponse(overrides))
        const request = signedInRequest(0)

        const thrown = await getAccessToken(request).catch(
          (/** @type {unknown} */ err) => err
        )

        expect(Boom.isBoom(thrown, 503)).toBe(true)
        expect(getTokens(request.yar)).toMatchObject({
          accessToken: 'access-old',
          refreshToken: 'refresh-old'
        })
        expect(signedOut(request)).toBe(false)
      }
    )
  })

  describe('when there are no tokens to use', () => {
    it('asks a session with no tokens to sign in again', async () => {
      const request = signedInRequest(300)
      request.yar.clear(TOKENS_KEY)

      await expect(getAccessToken(request)).rejects.toBeInstanceOf(
        SignInRequiredError
      )
      expect(signedOut(request)).toBe(true)
    })

    it('asks an unauthenticated request to sign in', async () => {
      const request = signedInRequest(300)
      request.auth.isAuthenticated = false

      await expect(getAccessToken(request)).rejects.toBeInstanceOf(
        SignInRequiredError
      )
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { TokenEndpointResponse, TokenEndpointResponseHelpers } from 'openid-client'
 */
