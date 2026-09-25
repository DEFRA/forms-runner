import { join } from 'node:path'

import { StatusCodes } from 'http-status-codes'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import { SIGNED_OUT_PATH, SIGN_OUT_PATH } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

jest.mock('openid-client')

const RETURN_PATH = '/homepage/test-form'
const SIGN_IN_URL = `/auth/sign-in?returnUrl=${RETURN_PATH}`
const CALLBACK_URL = '/auth/callback?code=code-1&state=state-1'
const AUTHORIZATION_URL = 'http://localhost:3011/auth?state=state-1'
const END_SESSION_URL =
  'http://localhost:3011/endSession?state=%7B%22previewMode%22%3A%22draft%22%2C%22slug%22%3A%22my-form-slug%22%7D'
const HOMEPAGE_PREVIEW_PATH = '/homepage/preview/draft/my-form-slug'
const HOMEPAGE_LIVE_PATH = '/homepage/my-form-slug'
const ISSUER = 'http://localhost:3011'
const RESOURCE = 'urn:defra:forms:forms-submission-api'
const SUB = 'sub-1'
const EMAIL = 'citizen@example.com'

/**
 * A token response carrying just the fields the callback route reads. Cast
 * through `unknown` because the mock leaves out the token type and the
 * helper methods `openid-client` adds to a real grant response.
 * @returns {TokenEndpointResponse & TokenEndpointResponseHelpers}
 */
function mockTokens() {
  return /** @type {TokenEndpointResponse & TokenEndpointResponseHelpers} */ (
    /** @type {unknown} */ ({
      id_token: 'header.payload.signature',
      access_token: 'access-1',
      claims: () => ({ iss: ISSUER, sub: SUB, email: EMAIL })
    })
  )
}

/** The provider accepts the code and names the citizen */
function mockSuccessfulExchange() {
  jest.mocked(client.authorizationCodeGrant).mockResolvedValue(mockTokens())
}

describe('sign in routes and sign out routes', () => {
  /** @type {Server} */
  let server

  /** Starts a sign in, so the session carries a transaction to come back to */
  function startSignIn() {
    return server.inject({ method: 'GET', url: SIGN_IN_URL })
  }

  beforeAll(async () => {
    config.set('useSignInFeature', true)

    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, '..', 'form', 'definitions'),
      enforceCsrf: false
    })

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
    config.set('useSignInFeature', false)
  })

  beforeEach(() => {
    jest
      .mocked(client.discovery)
      .mockResolvedValue(/** @type {Configuration} */ ({}))
    jest.mocked(client.randomPKCECodeVerifier).mockReturnValue('verifier-1')
    jest.mocked(client.randomState).mockReturnValue('state-1')
    jest.mocked(client.randomNonce).mockReturnValue('nonce-1')
    jest
      .mocked(client.calculatePKCECodeChallenge)
      .mockResolvedValue('challenge-1')
    jest
      .mocked(client.buildAuthorizationUrl)
      .mockReturnValue(new URL(AUTHORIZATION_URL))
    jest
      .mocked(client.buildEndSessionUrl)
      .mockReturnValue(new URL(END_SESSION_URL))
  })

  it('sends the citizen to the provider with PKCE, state and nonce', async () => {
    const response = await startSignIn()

    expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe(AUTHORIZATION_URL)

    const [, params] = jest.mocked(client.buildAuthorizationUrl).mock.calls[0]

    expect(params).toMatchObject({
      scope: 'openid email',
      state: 'state-1',
      nonce: 'nonce-1',
      code_challenge: 'challenge-1',
      code_challenge_method: 'S256',
      // Naming the resource only at the token endpoint returns an opaque
      // token and no error, so it is named here too
      resource: RESOURCE
    })
  })

  it('takes the email from the ID token, which carries it once the token is bound to a resource', async () => {
    const login = await startSignIn()

    mockSuccessfulExchange()

    const response = await server.inject({
      method: 'GET',
      url: CALLBACK_URL,
      headers: getCookieHeader(login, ['session'])
    })

    expect(client.fetchUserInfo).not.toHaveBeenCalled()
    expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe(RETURN_PATH)
  })

  it('asks the token endpoint for a token the submission API will accept', async () => {
    const login = await startSignIn()

    mockSuccessfulExchange()

    await server.inject({
      method: 'GET',
      url: CALLBACK_URL,
      headers: getCookieHeader(login, ['session'])
    })

    // the fourth argument is tokenEndpointParameters; the third is the checks
    const tokenEndpointParameters = jest.mocked(client.authorizationCodeGrant)
      .mock.calls[0][3]

    expect(tokenEndpointParameters).toMatchObject({ resource: RESOURCE })
  })

  it('exchanges the code against the configured redirect URI, not whatever the request claims its host is', async () => {
    const login = await startSignIn()

    mockSuccessfulExchange()

    await server.inject({
      method: 'GET',
      url: CALLBACK_URL,
      headers: {
        ...getCookieHeader(login, ['session']),
        host: 'evil.example'
      }
    })

    const [, calledUrl] = jest.mocked(client.authorizationCodeGrant).mock
      .calls[0]

    expect(calledUrl).toBeInstanceOf(URL)
    expect(/** @type {URL} */ (calledUrl).origin).toBe('http://localhost:3009')
    expect(/** @type {URL} */ (calledUrl).pathname).toBe('/auth/callback')
  })

  it('refuses a callback whose state does not match the one it issued', async () => {
    const login = await startSignIn()

    const response = await server.inject({
      method: 'GET',
      url: '/auth/callback?code=code-1&state=someone-elses-state',
      headers: getCookieHeader(login, ['session'])
    })

    expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
    expect(client.authorizationCodeGrant).not.toHaveBeenCalled()
  })

  it('leaves the transaction intact when a callback state does not match, so the genuine callback still completes', async () => {
    const login = await startSignIn()
    const cookie = getCookieHeader(login, ['session'])

    const mismatched = await server.inject({
      method: 'GET',
      url: '/auth/callback?code=attacker-code&state=someone-elses-state',
      headers: cookie
    })

    expect(mismatched.statusCode).toBe(StatusCodes.FORBIDDEN)
    expect(client.authorizationCodeGrant).not.toHaveBeenCalled()

    mockSuccessfulExchange()

    const genuine = await server.inject({
      method: 'GET',
      url: CALLBACK_URL,
      headers: cookie
    })

    expect(genuine.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(genuine.headers.location).toBe(RETURN_PATH)
  })

  it('consumes the transaction on a successful callback, so a replay of the same URL finds nothing', async () => {
    const login = await startSignIn()
    const cookie = getCookieHeader(login, ['session'])

    mockSuccessfulExchange()

    const first = await server.inject({
      method: 'GET',
      url: CALLBACK_URL,
      headers: cookie
    })

    expect(first.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)

    const replay = await server.inject({
      method: 'GET',
      url: CALLBACK_URL,
      headers: cookie
    })

    expect(replay.statusCode).toBe(StatusCodes.FORBIDDEN)
  })

  it('consumes the transaction when the exchange fails, so the same callback cannot be tried again', async () => {
    const login = await startSignIn()
    const cookie = getCookieHeader(login, ['session'])

    jest
      .mocked(client.authorizationCodeGrant)
      .mockRejectedValue(new Error('provider rejected the code'))

    const failed = await server.inject({
      method: 'GET',
      url: CALLBACK_URL,
      headers: cookie
    })

    expect(failed.statusCode).toBe(StatusCodes.FORBIDDEN)

    mockSuccessfulExchange()

    const retry = await server.inject({
      method: 'GET',
      url: CALLBACK_URL,
      headers: cookie
    })

    expect(retry.statusCode).toBe(StatusCodes.FORBIDDEN)
  })

  it('refuses a sign in when the provider gives no email, because the identity would be incomplete', async () => {
    const login = await startSignIn()

    const withoutEmail = mockTokens()
    withoutEmail.claims = () =>
      /** @type {ReturnType<typeof withoutEmail.claims>} */ ({
        iss: ISSUER,
        sub: SUB
      })
    jest.mocked(client.authorizationCodeGrant).mockResolvedValue(withoutEmail)

    const response = await server.inject({
      method: 'GET',
      url: CALLBACK_URL,
      headers: getCookieHeader(login, ['session'])
    })

    expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
  })

  it.each([
    ['leaves the service', '?returnUrl=//evil.example'],
    ['names another site outright', '?returnUrl=https://evil.example'],
    ['is missing', '']
  ])(
    'refuses to start a sign in whose return target %s, before the citizen spends one',
    async (_case, query) => {
      const response = await server.inject({
        method: 'GET',
        url: `/auth/sign-in${query}`
      })

      // Refused before the provider is involved. Otherwise the user signs in
      // and lands on a page that does not exist.
      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST)
      expect(client.buildAuthorizationUrl).not.toHaveBeenCalled()
    }
  )

  it('starts a sign in from a link carrying a parameter it has no use for, because a citizen can arrive here from anywhere', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `${SIGN_IN_URL}&utm_source=email`
    })

    expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe(AUTHORIZATION_URL)
  })

  it('normalises a return target carrying a control character before storing it, so the eventual redirect does not carry it raw', async () => {
    const login = await server.inject({
      method: 'GET',
      url: `/auth/sign-in?returnUrl=${encodeURIComponent(`${RETURN_PATH}\nSet-Cookie: a=b`)}`
    })

    mockSuccessfulExchange()

    const response = await server.inject({
      method: 'GET',
      url: CALLBACK_URL,
      headers: getCookieHeader(login, ['session'])
    })

    // The raw string would throw in Node's header validation, outside the
    // route's try/catch, giving a 500 after a successful sign in.
    expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe(
      '/homepage/test-formSet-Cookie:%20a=b'
    )
  })

  it('performs a sign-out', async () => {
    const login = await startSignIn()

    mockSuccessfulExchange()

    const response = await server.inject({
      method: 'GET',
      url: CALLBACK_URL,
      headers: getCookieHeader(login, ['session'])
    })

    expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe(RETURN_PATH)

    const signOutResponse = await server.inject({
      method: 'GET',
      url: SIGN_OUT_PATH,
      headers: getCookieHeader(login, ['session'])
    })

    expect(signOutResponse.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(signOutResponse.headers.location).toBe(END_SESSION_URL)
  })

  describe('sign-out with a Cancel on the provider', () => {
    const FORM_PAGE = '/test-form/page-two'

    /**
     * Signs a citizen in and returns the cookie header of their session
     */
    async function signIn() {
      const login = await startSignIn()
      mockSuccessfulExchange()

      const headers = getCookieHeader(login, ['session'])
      await server.inject({ method: 'GET', url: CALLBACK_URL, headers })

      return headers
    }

    /**
     * The `id_token_hint` that sign-out sends. It is there only while the
     * session holds the citizen's identity.
     * @param {ReturnType<typeof getCookieHeader>} headers
     */
    async function idTokenHint(headers) {
      jest.mocked(client.buildEndSessionUrl).mockClear()
      await server.inject({ method: 'GET', url: SIGN_OUT_PATH, headers })

      const [[, parameters]] = jest.mocked(client.buildEndSessionUrl).mock.calls

      return new URLSearchParams(parameters).get('id_token_hint') ?? undefined
    }

    /**
     * The URL the provider sends the citizen back to
     * @param {object} state - the state that sign-out sent
     * @param {boolean} [cancelled] - true when the citizen selected Cancel
     */
    function signedOutUrl(state, cancelled = false) {
      const query = new URLSearchParams({ state: JSON.stringify(state) })

      if (cancelled) {
        query.set('cancelled', 'true')
      }

      return `${SIGNED_OUT_PATH}?${query.toString()}`
    }

    it('sends the page the citizen left to the provider, and keeps them signed in until they come back', async () => {
      const headers = await signIn()

      const response = await server.inject({
        method: 'GET',
        url: `${SIGN_OUT_PATH}?slug=my-form-slug&returnUrl=${encodeURIComponent(FORM_PAGE)}`,
        headers
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(client.buildEndSessionUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id_token_hint: 'header.payload.signature',
          state: JSON.stringify({ slug: 'my-form-slug', returnUrl: FORM_PAGE })
        })
      )
      expect(await idTokenHint(headers)).toBe('header.payload.signature')
    })

    it.each(['https://example.com/', '//example.com/'])(
      'refuses a sign-out whose return target %s is outside this service',
      async (returnUrl) => {
        const response = await server.inject({
          method: 'GET',
          url: `${SIGN_OUT_PATH}?slug=my-form-slug&returnUrl=${encodeURIComponent(returnUrl)}`
        })

        expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST)
      }
    )

    it('sends a citizen who cancels back to the page they left, still signed in', async () => {
      const headers = await signIn()

      const response = await server.inject({
        method: 'GET',
        url: signedOutUrl({ slug: 'my-form-slug', returnUrl: FORM_PAGE }, true),
        headers
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(FORM_PAGE)
      expect(await idTokenHint(headers)).toBe('header.payload.signature')
    })

    it.each(['https://example.com/', '//example.com/', 'javascript:alert(1)'])(
      'sends a citizen who cancels to the form homepage when the return target %s is outside this service',
      async (returnUrl) => {
        const response = await server.inject({
          method: 'GET',
          url: signedOutUrl({ slug: 'my-form-slug', returnUrl }, true)
        })

        expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect(response.headers.location).toBe(HOMEPAGE_LIVE_PATH)
      }
    )

    it('ends the session when the citizen comes back from a completed sign-out', async () => {
      const headers = await signIn()

      const response = await server.inject({
        method: 'GET',
        url: signedOutUrl({ slug: 'my-form-slug', returnUrl: FORM_PAGE }),
        headers
      })

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(await idTokenHint(headers)).toBeUndefined()
    })

    it('sends the citizen to GOV.UK when the state cannot be read', async () => {
      const cancelled = await server.inject({
        method: 'GET',
        url: `${SIGNED_OUT_PATH}?state=not-json&cancelled=true`
      })
      expect(cancelled.headers.location).toBe('https://www.gov.uk')

      const { container, response } = await renderResponse(server, {
        method: 'GET',
        url: `${SIGNED_OUT_PATH}?state=not-json`
      })
      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(
        container.getByRole('link', { name: 'sign in again' })
      ).toHaveAttribute('href', 'https://www.gov.uk')
    })
  })

  it('renders the signed-out page with correct links in preview mode (English text)', async () => {
    const { container, response, document } = await renderResponse(server, {
      method: 'GET',
      url: `${SIGNED_OUT_PATH}?state=%7B%22previewMode%22%3A%22draft%22%2C%22slug%22%3A%22my-form-slug%22%7D`
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
    const $heading = container.getByRole('heading', { level: 1 })
    const $signInAgain = container.getByRole('link', { name: 'sign in again' })
    const $goToGovUk = container.getByRole('link', {
      name: 'go to the GOV.UK homepage'
    })
    expect($heading.textContent.trim()).toBe('You have signed out')
    expect($signInAgain).toHaveAttribute('href', HOMEPAGE_PREVIEW_PATH)
    expect($goToGovUk).toBeInTheDocument()
    const $bodyElems = Array.from(document.getElementsByClassName('govuk-body'))
    const bodyText = $bodyElems.map((elem) => elem.textContent).join(' ')
    expect(bodyText).toContain('Or go to the GOV.UK homepage')
    expect(bodyText).toContain('To go back')
  })

  it('renders the signed-out page with correct links in preview mode (Welsh text)', async () => {
    const { container, response, document } = await renderResponse(server, {
      method: 'GET',
      url: `${SIGNED_OUT_PATH}?state=%7B%22previewMode%22%3A%22draft%22%2C%22slug%22%3A%22my-form-slug%22%7D&language=cy`
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
    const $heading = container.getByRole('heading', { level: 1 })
    const $signInAgain = container.getByRole('link', {
      name: 'mewngofnodi eto'
    })
    const $goToGovUk = container.getByRole('link', {
      name: 'ewch i hafan GOV.UK'
    })
    expect($heading.textContent.trim()).toBe('Rydych chi wedi allgofnodi')
    expect($signInAgain).toHaveAttribute('href', HOMEPAGE_PREVIEW_PATH)
    expect($goToGovUk).toBeInTheDocument()
    const $bodyElems = Array.from(document.getElementsByClassName('govuk-body'))
    const bodyText = $bodyElems.map((elem) => elem.textContent).join(' ')
    expect(bodyText).toContain('Neu ewch i hafan GOV.UK')
    expect(bodyText).toContain('I fynd yn ôl')
  })

  it('renders the signed-out page with correct links in live mode', async () => {
    const { container, response } = await renderResponse(server, {
      method: 'GET',
      url: `${SIGNED_OUT_PATH}?state=%7B%22previewMode%22%3A%22%22%2C%22slug%22%3A%22my-form-slug%22%7D`
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
    const $signInAgain = container.getByRole('link', { name: 'sign in again' })
    const $goToGovUk = container.getByRole('link', {
      name: 'go to the GOV.UK homepage'
    })
    expect($signInAgain).toHaveAttribute('href', HOMEPAGE_LIVE_PATH)
    expect($goToGovUk).toBeInTheDocument()
  })
})

describe('sign in routes, feature flag off', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    // Read inside the plugin's `register`, not at module scope, so the flag
    // must already be false before the server — and its router — is built.
    config.set('useSignInFeature', false)

    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, '..', 'form', 'definitions'),
      enforceCsrf: false
    })

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
    config.set('useSignInFeature', false)
  })

  it.each([
    ['/auth/sign-in', '/auth/sign-in'],
    ['/auth/callback', '/auth/callback'],
    ['/auth/sign-out', '/auth/sign-out'],
    [RETURN_PATH, '/homepage/{slug}']
  ])(
    'is not registered when the sign-in feature is off (%s)',
    (path, ownRouteTemplate) => {
      // A catch-all legacy redirect answers every short path this service
      // has ever served, so an unregistered route is not visible as "no
      // route matched" — it's visible as some other route being the one
      // that matched. Comparing against the route each handler would own
      // proves this one didn't.
      expect(server.match('get', path)?.path).not.toBe(ownRouteTemplate)
    }
  )
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { Configuration, TokenEndpointResponse, TokenEndpointResponseHelpers } from 'openid-client'
 */
