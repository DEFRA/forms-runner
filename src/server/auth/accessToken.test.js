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

  it('returns the new tokens without writing to the session', async () => {
    jest.mocked(client.refreshTokenGrant).mockResolvedValue(refreshResponse())
    const request = signedInRequest(10)

    const refreshed = await refreshAccessToken(request, SUB, tokensOf(request))

    expect(refreshed).toEqual({
      accessToken: 'access-new',
      accessTokenExpiresAt: expect.any(Number),
      refreshToken: 'refresh-old',
      idToken: 'id-new'
    })

    const expiresIn = (refreshed?.accessTokenExpiresAt ?? 0) - Date.now()
    expect(expiresIn).toBeGreaterThan(299_000)
    expect(expiresIn).toBeLessThanOrEqual(300_000)
    expect(request.yar.set).not.toHaveBeenCalled()
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
    ).resolves.toMatchObject({
      accessToken: 'access-new',
      refreshToken: 'refresh-old',
      idToken: 'id-old'
    })
  })

  it('returns a refresh token the response carries', async () => {
    jest
      .mocked(client.refreshTokenGrant)
      .mockResolvedValue(refreshResponse({ refresh_token: 'refresh-new' }))
    const request = signedInRequest(0)

    await expect(
      refreshAccessToken(request, SUB, tokensOf(request))
    ).resolves.toMatchObject({ refreshToken: 'refresh-new' })
  })

  describe('when the provider refuses the refresh token', () => {
    it('asks the citizen to sign in, leaving the session to the scheme', async () => {
      jest
        .mocked(client.refreshTokenGrant)
        .mockRejectedValue(responseBodyError('invalid_grant'))
      const request = signedInRequest(0)

      await expect(
        refreshAccessToken(request, SUB, tokensOf(request))
      ).rejects.toBeInstanceOf(SignInRequiredError)
      expect(request.yar.set).not.toHaveBeenCalled()
    })

    it('treats an ID token for a different citizen the same way', async () => {
      jest
        .mocked(client.refreshTokenGrant)
        .mockResolvedValue(refreshResponse({}, 'someone-else'))
      const request = signedInRequest(0)

      await expect(
        refreshAccessToken(request, SUB, tokensOf(request))
      ).rejects.toBeInstanceOf(SignInRequiredError)
      expect(request.yar.set).not.toHaveBeenCalled()
    })
  })

  describe('when the refresh fails for another reason', () => {
    it.each([
      ['a network failure', new TypeError('fetch failed')],
      ['a provider error', responseBodyError('server_error')],
      ['a value that is not an error', 'unexpected']
    ])(
      'returns no tokens after %s, and leaves the session alone',
      async (_case, error) => {
        jest.mocked(client.refreshTokenGrant).mockRejectedValue(error)
        const request = signedInRequest(0)

        await expect(
          refreshAccessToken(request, SUB, tokensOf(request))
        ).resolves.toBeUndefined()
        expect(request.yar.set).not.toHaveBeenCalled()
      }
    )
  })

  describe('when the refresh response is incomplete', () => {
    it.each([
      ['no access token', { access_token: undefined }],
      ['no expiry', { expires_in: undefined }]
    ])(
      'returns no tokens when it has %s, and leaves the session alone',
      async (_case, overrides) => {
        jest
          .mocked(client.refreshTokenGrant)
          .mockResolvedValue(refreshResponse(overrides))
        const request = signedInRequest(0)

        await expect(
          refreshAccessToken(request, SUB, tokensOf(request))
        ).resolves.toBeUndefined()
        expect(request.yar.set).not.toHaveBeenCalled()
      }
    )
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { TokenEndpointResponse, TokenEndpointResponseHelpers } from 'openid-client'
 * @import { TokenSet } from '~/src/server/auth/accountSession.js'
 */
