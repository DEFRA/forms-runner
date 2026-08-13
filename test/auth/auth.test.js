import { join } from 'node:path'

import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
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
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { Configuration, TokenEndpointResponse, TokenEndpointResponseHelpers } from 'openid-client'
 */
