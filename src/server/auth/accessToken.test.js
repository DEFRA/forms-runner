import Boom from '@hapi/boom'
import * as client from 'openid-client'

import { SignInRequiredError } from '~/src/server/auth/SignInRequiredError.js'
import { getAccessToken } from '~/src/server/auth/accessToken.js'
import { CITIZEN_KEY } from '~/src/server/auth/accountSession.js'
import * as tokenStore from '~/src/server/auth/tokenStore.js'

jest.mock('openid-client', () => ({
  ...jest.requireActual('openid-client'),
  refreshTokenGrant: jest.fn()
}))

const NOW = new Date('2026-09-16T09:00:00.000Z')
const SUB = 'sub-1'
const RESOURCE = 'urn:defra:forms:forms-submission-api'
const OIDC_CONFIG = /** @type {client.Configuration} */ ({})

/** @type {number} */
let tokenSetCount = 0

/**
 * A request as the citizen-session scheme presents it, with a token set in
 * the store that has the given number of seconds left
 * @param {number} secondsLeft
 */
async function signedInRequest(secondsLeft) {
  tokenSetCount += 1
  const tokenSetId = `token-set-${tokenSetCount}`

  await tokenStore.set(tokenSetId, {
    accessToken: 'access-old',
    accessTokenExpiresAt: Date.now() + secondsLeft * 1000,
    refreshToken: 'refresh-old',
    idToken: 'id-old',
    sub: SUB
  })

  const request = /** @type {Request} */ (
    /** @type {unknown} */ ({
      auth: {
        isAuthenticated: true,
        credentials: {
          iss: 'http://localhost:3011',
          sub: SUB,
          email: 'citizen@example.com',
          tokenSetId
        }
      },
      yar: { set: jest.fn(), get: jest.fn(), clear: jest.fn() },
      server: {
        app: { oidc: { getConfig: jest.fn().mockResolvedValue(OIDC_CONFIG) } }
      }
    })
  )

  return { request, tokenSetId }
}

/**
 * A refresh response as openid-client returns it
 * @param {Partial<TokenEndpointResponse>} [overrides]
 * @param {string} [sub] - the subject the ID token names
 */
function refreshResponse(overrides = {}, sub = SUB) {
  const response = {
    access_token: 'access-new',
    refresh_token: 'refresh-new',
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
function identityCleared(request) {
  // yar.set is overloaded, so its mock calls are typed by the last overload
  const calls = /** @type {[string, unknown][]} */ (
    /** @type {unknown} */ (jest.mocked(request.yar.set).mock.calls)
  )

  return calls.some(
    ([key, value]) => key === CITIZEN_KEY && value === undefined
  )
}

describe('getAccessToken', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, advanceTimers: true })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns a token with more than the grace period left, without refreshing', async () => {
    const { request } = await signedInRequest(31)

    await expect(getAccessToken(request)).resolves.toBe('access-old')
    expect(client.refreshTokenGrant).not.toHaveBeenCalled()
  })

  it.each([30, 10, -60])(
    'refreshes a token with %i seconds left and saves every new token',
    async (secondsLeft) => {
      jest.mocked(client.refreshTokenGrant).mockResolvedValue(refreshResponse())
      const { request, tokenSetId } = await signedInRequest(secondsLeft)

      await expect(getAccessToken(request)).resolves.toBe('access-new')

      await expect(tokenStore.get(tokenSetId)).resolves.toEqual({
        accessToken: 'access-new',
        accessTokenExpiresAt: expect.any(Number),
        refreshToken: 'refresh-new',
        idToken: 'id-new',
        sub: SUB
      })

      const saved = await tokenStore.get(tokenSetId)
      const expiresIn = (saved?.accessTokenExpiresAt ?? 0) - Date.now()
      expect(expiresIn).toBeGreaterThan(299_000)
      expect(expiresIn).toBeLessThanOrEqual(300_000)
    }
  )

  it('sends the refresh token and names the API the token is for', async () => {
    jest.mocked(client.refreshTokenGrant).mockResolvedValue(refreshResponse())
    const { request } = await signedInRequest(0)

    await getAccessToken(request)

    expect(client.refreshTokenGrant).toHaveBeenCalledWith(
      OIDC_CONFIG,
      'refresh-old',
      { resource: RESOURCE }
    )
  })

  it('keeps the current refresh token and ID token when the response has none', async () => {
    jest
      .mocked(client.refreshTokenGrant)
      .mockResolvedValue(
        refreshResponse({ refresh_token: undefined, id_token: undefined })
      )
    const { request, tokenSetId } = await signedInRequest(0)

    await expect(getAccessToken(request)).resolves.toBe('access-new')

    await expect(tokenStore.get(tokenSetId)).resolves.toMatchObject({
      accessToken: 'access-new',
      refreshToken: 'refresh-old',
      idToken: 'id-old'
    })
  })

  it('makes one refresh request for concurrent calls, and gives both the new token', async () => {
    /** @type {(value: ReturnType<typeof refreshResponse>) => void} */
    let finishRefresh = () => undefined
    jest.mocked(client.refreshTokenGrant).mockReturnValue(
      new Promise((resolve) => {
        finishRefresh = resolve
      })
    )
    const { request } = await signedInRequest(5)

    const first = getAccessToken(request)
    const second = getAccessToken(request)

    // the second call is waiting on the first call's lock
    await jest.advanceTimersByTimeAsync(250)
    finishRefresh(refreshResponse())

    await expect(Promise.all([first, second])).resolves.toEqual([
      'access-new',
      'access-new'
    ])
    expect(client.refreshTokenGrant).toHaveBeenCalledTimes(1)
  })

  it('releases the lock after a refresh, so the next refresh can take it', async () => {
    jest
      .mocked(client.refreshTokenGrant)
      .mockResolvedValue(refreshResponse({ expires_in: 10 }))
    const { request, tokenSetId } = await signedInRequest(0)

    await getAccessToken(request)

    const lockValue = await tokenStore.acquireLock(tokenSetId)
    expect(lockValue).toEqual(expect.any(String))
  })

  describe('when the provider refuses the refresh token', () => {
    it('removes the tokens and the identity, and asks the citizen to sign in', async () => {
      jest
        .mocked(client.refreshTokenGrant)
        .mockRejectedValue(responseBodyError('invalid_grant'))
      const { request, tokenSetId } = await signedInRequest(0)

      await expect(getAccessToken(request)).rejects.toBeInstanceOf(
        SignInRequiredError
      )

      await expect(tokenStore.get(tokenSetId)).resolves.toBeNull()
      expect(identityCleared(request)).toBe(true)
    })

    it('treats an ID token for a different citizen the same way', async () => {
      jest
        .mocked(client.refreshTokenGrant)
        .mockResolvedValue(refreshResponse({}, 'someone-else'))
      const { request, tokenSetId } = await signedInRequest(0)

      await expect(getAccessToken(request)).rejects.toBeInstanceOf(
        SignInRequiredError
      )

      await expect(tokenStore.get(tokenSetId)).resolves.toBeNull()
      expect(identityCleared(request)).toBe(true)
    })
  })

  describe('when the refresh fails for another reason', () => {
    it.each([
      ['a network failure', new TypeError('fetch failed')],
      ['a provider error', responseBodyError('server_error')]
    ])(
      'keeps the tokens and identity after %s, and answers 503',
      async (_case, error) => {
        jest.mocked(client.refreshTokenGrant).mockRejectedValue(error)
        const { request, tokenSetId } = await signedInRequest(0)

        const thrown = await getAccessToken(request).catch(
          (/** @type {unknown} */ err) => err
        )

        expect(Boom.isBoom(thrown, 503)).toBe(true)
        await expect(tokenStore.get(tokenSetId)).resolves.toMatchObject({
          refreshToken: 'refresh-old'
        })
        expect(identityCleared(request)).toBe(false)
      }
    )
  })

  describe('when there are no tokens to use', () => {
    it('asks a session from before the token store to sign in again', async () => {
      const { request } = await signedInRequest(300)
      const credentials = /** @type {Record<string, unknown>} */ (
        request.auth.credentials
      )
      delete credentials.tokenSetId

      await expect(getAccessToken(request)).rejects.toBeInstanceOf(
        SignInRequiredError
      )
      expect(identityCleared(request)).toBe(true)
    })

    it('asks the citizen to sign in when the token record has gone', async () => {
      const { request, tokenSetId } = await signedInRequest(300)
      await tokenStore.delete(tokenSetId)

      await expect(getAccessToken(request)).rejects.toBeInstanceOf(
        SignInRequiredError
      )
    })

    it('asks an unauthenticated request to sign in', async () => {
      const { request } = await signedInRequest(300)
      request.auth.isAuthenticated = false

      await expect(getAccessToken(request)).rejects.toBeInstanceOf(
        SignInRequiredError
      )
    })
  })

  it('answers 503 when another request holds the lock and never saves new tokens', async () => {
    const { request, tokenSetId } = await signedInRequest(0)
    await tokenStore.acquireLock(tokenSetId)

    const result = getAccessToken(request).catch(
      (/** @type {unknown} */ err) => err
    )
    await jest.advanceTimersByTimeAsync(5500)

    const thrown = await result
    expect(Boom.isBoom(thrown, 503)).toBe(true)
    expect(client.refreshTokenGrant).not.toHaveBeenCalled()
    expect(identityCleared(request)).toBe(false)
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { TokenEndpointResponse, TokenEndpointResponseHelpers } from 'openid-client'
 */
