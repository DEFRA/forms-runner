import hapi from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'

import { getIdentity } from '~/src/server/auth/accountSession.js'
import pluginAuth from '~/src/server/plugins/auth.js'

jest.mock('~/src/server/auth/accountSession.js')

const identity = {
  iss: 'http://localhost:3011',
  sub: '0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0',
  email: 'citizen@example.com',
  idToken: 'header.payload.signature'
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

describe('citizen-session strategy', () => {
  it('leaves an anonymous request unauthenticated rather than rejecting it', async () => {
    jest.mocked(getIdentity).mockReturnValue(null)

    const server = hapi.server()
    await server.register(pluginAuth)
    setupProbeEndpoint(server)

    const response = await server.inject({ method: 'GET', url: '/probe' })

    expect(response.statusCode).toBe(StatusCodes.OK)
    expect(response.result).toMatchObject({ isAuthenticated: false })
  })

  it('puts the stored identity on the request', async () => {
    jest.mocked(getIdentity).mockReturnValue(identity)

    const server = hapi.server()
    await server.register(pluginAuth)
    setupProbeEndpoint(server)

    const response = await server.inject({ method: 'GET', url: '/probe' })

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
})
