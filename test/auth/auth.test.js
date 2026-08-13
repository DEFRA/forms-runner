import { join } from 'node:path'

import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

jest.mock('openid-client')

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
      claims: () => ({ iss: 'http://localhost:3011', sub: 'sub-1' })
    })
  )
}

describe('sign in routes', () => {
  /** @type {Server} */
  let server

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
      .mockReturnValue(new URL('http://localhost:3011/auth?state=state-1'))
  })

  it('sends the citizen to the provider with PKCE, state and nonce', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/login?returnTo=/homepage/test-form'
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      'http://localhost:3011/auth?state=state-1'
    )

    const [, params] = jest.mocked(client.buildAuthorizationUrl).mock.calls[0]

    expect(params).toMatchObject({
      scope: 'openid email',
      state: 'state-1',
      nonce: 'nonce-1',
      code_challenge: 'challenge-1',
      code_challenge_method: 'S256'
    })
  })

  it('takes the email from userinfo, because the ID token does not carry it', async () => {
    const login = await server.inject({
      method: 'GET',
      url: '/login?returnTo=/homepage/test-form'
    })

    jest.mocked(client.authorizationCodeGrant).mockResolvedValue(mockTokens())
    jest
      .mocked(client.fetchUserInfo)
      .mockResolvedValue({ sub: 'sub-1', email: 'citizen@example.com' })

    const response = await server.inject({
      method: 'GET',
      url: '/callback?code=code-1&state=state-1',
      headers: getCookieHeader(login, ['session'])
    })

    expect(client.fetchUserInfo).toHaveBeenCalledWith(
      expect.anything(),
      'access-1',
      'sub-1'
    )
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/homepage/test-form')
  })

  it('exchanges the code against the configured redirect URI, not whatever the request claims its host is', async () => {
    const login = await server.inject({
      method: 'GET',
      url: '/login?returnTo=/homepage/test-form'
    })

    jest.mocked(client.authorizationCodeGrant).mockResolvedValue(mockTokens())
    jest
      .mocked(client.fetchUserInfo)
      .mockResolvedValue({ sub: 'sub-1', email: 'citizen@example.com' })

    await server.inject({
      method: 'GET',
      url: '/callback?code=code-1&state=state-1',
      headers: {
        ...getCookieHeader(login, ['session']),
        host: 'evil.example'
      }
    })

    const [, calledUrl] = jest.mocked(client.authorizationCodeGrant).mock
      .calls[0]

    expect(calledUrl).toBeInstanceOf(URL)
    expect(/** @type {URL} */ (calledUrl).origin).toBe('http://localhost:3009')
    expect(/** @type {URL} */ (calledUrl).pathname).toBe('/callback')
  })

  it('refuses a callback whose state does not match the one it issued', async () => {
    const login = await server.inject({
      method: 'GET',
      url: '/login?returnTo=/homepage/test-form'
    })

    const response = await server.inject({
      method: 'GET',
      url: '/callback?code=code-1&state=someone-elses-state',
      headers: getCookieHeader(login, ['session'])
    })

    expect(response.statusCode).toBe(403)
    expect(client.authorizationCodeGrant).not.toHaveBeenCalled()
  })

  it('leaves the transaction intact when a callback state does not match, so the genuine callback still completes', async () => {
    const login = await server.inject({
      method: 'GET',
      url: '/login?returnTo=/homepage/test-form'
    })
    const cookie = getCookieHeader(login, ['session'])

    const mismatched = await server.inject({
      method: 'GET',
      url: '/callback?code=attacker-code&state=someone-elses-state',
      headers: cookie
    })

    expect(mismatched.statusCode).toBe(403)
    expect(client.authorizationCodeGrant).not.toHaveBeenCalled()

    jest.mocked(client.authorizationCodeGrant).mockResolvedValue(mockTokens())
    jest
      .mocked(client.fetchUserInfo)
      .mockResolvedValue({ sub: 'sub-1', email: 'citizen@example.com' })

    const genuine = await server.inject({
      method: 'GET',
      url: '/callback?code=code-1&state=state-1',
      headers: cookie
    })

    expect(genuine.statusCode).toBe(302)
    expect(genuine.headers.location).toBe('/homepage/test-form')
  })

  it('consumes the transaction on a successful callback, so a replay of the same URL finds nothing', async () => {
    const login = await server.inject({
      method: 'GET',
      url: '/login?returnTo=/homepage/test-form'
    })
    const cookie = getCookieHeader(login, ['session'])

    jest.mocked(client.authorizationCodeGrant).mockResolvedValue(mockTokens())
    jest
      .mocked(client.fetchUserInfo)
      .mockResolvedValue({ sub: 'sub-1', email: 'citizen@example.com' })

    const first = await server.inject({
      method: 'GET',
      url: '/callback?code=code-1&state=state-1',
      headers: cookie
    })

    expect(first.statusCode).toBe(302)

    const replay = await server.inject({
      method: 'GET',
      url: '/callback?code=code-1&state=state-1',
      headers: cookie
    })

    expect(replay.statusCode).toBe(403)
  })

  it('refuses a sign in when the provider gives no email, because the identity would be incomplete', async () => {
    const login = await server.inject({
      method: 'GET',
      url: '/login?returnTo=/homepage/test-form'
    })

    jest.mocked(client.authorizationCodeGrant).mockResolvedValue(mockTokens())
    jest.mocked(client.fetchUserInfo).mockResolvedValue({ sub: 'sub-1' })

    const response = await server.inject({
      method: 'GET',
      url: '/callback?code=code-1&state=state-1',
      headers: getCookieHeader(login, ['session'])
    })

    expect(response.statusCode).toBe(403)
  })

  it('does not follow a return target that leaves the service', async () => {
    const login = await server.inject({
      method: 'GET',
      url: '/login?returnTo=//evil.example'
    })

    jest.mocked(client.authorizationCodeGrant).mockResolvedValue(mockTokens())
    jest
      .mocked(client.fetchUserInfo)
      .mockResolvedValue({ sub: 'sub-1', email: 'citizen@example.com' })

    const response = await server.inject({
      method: 'GET',
      url: '/callback?code=code-1&state=state-1',
      headers: getCookieHeader(login, ['session'])
    })

    expect(response.headers.location).toBe('/')
  })

  it('ends the provider session with the token it was given, then clears its own', async () => {
    jest
      .mocked(client.buildEndSessionUrl)
      .mockReturnValue(new URL('http://localhost:3011/session/end'))

    const response = await server.inject({
      method: 'GET',
      url: '/logout?slug=test-form',
      auth: {
        strategy: 'citizen-session',
        credentials: {
          iss: 'http://localhost:3011',
          sub: 'sub-1',
          email: 'citizen@example.com',
          idToken: 'header.payload.signature'
        }
      }
    })

    const [, params] = jest.mocked(client.buildEndSessionUrl).mock.calls[0]

    expect(params).toMatchObject({
      id_token_hint: 'header.payload.signature',
      post_logout_redirect_uri: 'http://localhost:3009/signed-out'
    })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('http://localhost:3011/session/end')
  })

  it('does not touch the session for a citizen who was never signed in, so their form answers survive', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/logout?slug=test-form'
    })

    expect(client.buildEndSessionUrl).not.toHaveBeenCalled()
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/homepage/test-form')
  })

  it('sends a never-signed-in citizen home when it does not know which form they came from', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/logout'
    })

    expect(client.buildEndSessionUrl).not.toHaveBeenCalled()
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/')
  })

  it('offers a way back to the form and a way out to GOV.UK', async () => {
    jest
      .mocked(client.buildEndSessionUrl)
      .mockReturnValue(new URL('http://localhost:3011/session/end'))

    const logout = await server.inject({
      method: 'GET',
      url: '/logout?slug=test-form',
      auth: {
        strategy: 'citizen-session',
        credentials: {
          iss: 'http://localhost:3011',
          sub: 'sub-1',
          email: 'citizen@example.com',
          idToken: 'header.payload.signature'
        }
      }
    })

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/signed-out',
      headers: getCookieHeader(logout, ['session'])
    })

    expect(
      container.getByRole('heading', { name: 'You have signed out', level: 1 })
    ).toBeInTheDocument()
    expect(
      container.getByRole('link', { name: 'sign in again' })
    ).toHaveAttribute('href', '/homepage/test-form')
    expect(
      container.getByRole('link', { name: 'go to the GOV.UK homepage' })
    ).toHaveAttribute('href', 'https://www.gov.uk')
  })

  it('omits the way back when it does not know which form it was', async () => {
    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/signed-out'
    })

    expect(
      container.queryByRole('link', { name: 'sign in again' })
    ).not.toBeInTheDocument()
    expect(
      container.getByRole('link', { name: 'go to the GOV.UK homepage' })
    ).toBeInTheDocument()
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
    ['/login', '/login'],
    ['/callback', '/callback'],
    ['/logout', '/logout'],
    ['/signed-out', '/signed-out'],
    ['/homepage/test-form', '/homepage/{slug}']
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
