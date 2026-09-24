import * as client from 'openid-client'

import { SignInRequiredError } from '~/src/server/auth/SignInRequiredError.js'
import {
  hasExpired,
  isUsable,
  refreshAccessToken
} from '~/src/server/auth/accessToken.js'
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
 * A request with a signed-in citizen in the session, whose access token has
 * the given number of seconds left
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
function tokensOf(request) {
  return /** @type {TokenSet} */ (getTokens(request.yar))
}

/**
 * @param {Request} request
 */
function signedOut(request) {
  return getIdentity(request.yar) === null && getTokens(request.yar) === null
}

describe('isUsable', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('accepts a token with more than the grace period left', () => {
    expect(isUsable(tokensOf(signedInRequest(31)))).toBe(true)
  })

  it.each([30, 10, -60])(
    'refuses a token with %i seconds left',
    (secondsLeft) => {
      expect(isUsable(tokensOf(signedInRequest(secondsLeft)))).toBe(false)
    }
  )
})

describe('hasExpired', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it.each([30, 1])(
    'accepts a token with %i seconds left, even inside the grace period',
    (secondsLeft) => {
      expect(hasExpired(tokensOf(signedInRequest(secondsLeft)))).toBe(false)
    }
  )

  it.each([0, -60])('refuses a token with %i seconds left', (secondsLeft) => {
    expect(hasExpired(tokensOf(signedInRequest(secondsLeft)))).toBe(true)
  })
})

describe('refreshAccessToken', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, advanceTimers: true })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('saves the new tokens in the session and returns the access token', async () => {
    jest.mocked(client.refreshTokenGrant).mockResolvedValue(refreshResponse())
    const request = signedInRequest(10)

    await expect(
      refreshAccessToken(request, SUB, tokensOf(request))
    ).resolves.toBe('access-new')

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
  })

  it('sends the refresh token and names the API the token is for', async () => {
    jest.mocked(client.refreshTokenGrant).mockResolvedValue(refreshResponse())
    const request = signedInRequest(0)

    await refreshAccessToken(request, SUB, tokensOf(request))

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

    await expect(
      refreshAccessToken(request, SUB, tokensOf(request))
    ).resolves.toBe('access-new')

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

    await refreshAccessToken(request, SUB, tokensOf(request))

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

      await expect(
        refreshAccessToken(request, SUB, tokensOf(request))
      ).rejects.toBeInstanceOf(SignInRequiredError)
      expect(signedOut(request)).toBe(true)
    })

    it('treats an ID token for a different citizen the same way', async () => {
      jest
        .mocked(client.refreshTokenGrant)
        .mockResolvedValue(refreshResponse({}, 'someone-else'))
      const request = signedInRequest(0)

      await expect(
        refreshAccessToken(request, SUB, tokensOf(request))
      ).rejects.toBeInstanceOf(SignInRequiredError)
      expect(signedOut(request)).toBe(true)
    })
  })

  describe('when the refresh fails for another reason', () => {
    it.each([
      ['a network failure', new TypeError('fetch failed')],
      ['a provider error', responseBodyError('server_error')],
      ['a value that is not an error', 'unexpected']
    ])(
      'keeps the tokens and identity after %s, and returns no token',
      async (_case, error) => {
        jest.mocked(client.refreshTokenGrant).mockRejectedValue(error)
        const request = signedInRequest(0)

        await expect(
          refreshAccessToken(request, SUB, tokensOf(request))
        ).resolves.toBeUndefined()
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
      'keeps the tokens and identity when it has %s, and returns no token',
      async (_case, overrides) => {
        jest
          .mocked(client.refreshTokenGrant)
          .mockResolvedValue(refreshResponse(overrides))
        const request = signedInRequest(0)

        await expect(
          refreshAccessToken(request, SUB, tokensOf(request))
        ).resolves.toBeUndefined()
        expect(getTokens(request.yar)).toMatchObject({
          accessToken: 'access-old',
          refreshToken: 'refresh-old'
        })
        expect(signedOut(request)).toBe(false)
      }
    )
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { TokenEndpointResponse, TokenEndpointResponseHelpers } from 'openid-client'
 * @import { TokenSet } from '~/src/server/auth/accountSession.js'
 */
