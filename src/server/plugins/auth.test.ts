import hapi from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'

import pluginAuth from '~/src/server/plugins/auth.js'

const identity = {
  iss: 'http://localhost:3011',
  sub: '0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0',
  email: 'citizen@example.com',
  idToken: 'header.payload.signature'
}

/** Stands in for yar, which this plugin only ever reads through */
function withFakeYar(server: hapi.Server, stored: object | null) {
  server.ext('onRequest', (request, h) => {
    const store = new Map<string, unknown>(stored ? [['citizen', stored]] : [])
    Object.defineProperty(request, 'yar', {
      value: {
        get: (key: string) => store.get(key) ?? null,
        set: (key: string, value: unknown) => store.set(key, value),
        clear: (key: string) => store.delete(key)
      }
    })
    return h.continue
  })
}

describe('citizen-session strategy', () => {
  it('leaves an anonymous request unauthenticated rather than rejecting it', async () => {
    const server = hapi.server()
    withFakeYar(server, null)
    await server.register(pluginAuth)
    server.route({
      method: 'GET',
      path: '/probe',
      handler: (request) => ({
        isAuthenticated: request.auth.isAuthenticated
      })
    })

    const response = await server.inject({ method: 'GET', url: '/probe' })

    expect(response.statusCode).toBe(StatusCodes.OK)
    expect(response.result).toEqual({ isAuthenticated: false })
  })

  it('puts the stored identity on the request', async () => {
    const server = hapi.server()
    withFakeYar(server, identity)
    await server.register(pluginAuth)
    server.route({
      method: 'GET',
      path: '/probe',
      handler: (request) => request.auth.credentials
    })

    const response = await server.inject({ method: 'GET', url: '/probe' })

    expect(response.result).toMatchObject({ email: 'citizen@example.com' })
  })

  it('applies to routes registered before it, so plugin routes are covered too', async () => {
    const server = hapi.server()
    withFakeYar(server, identity)
    server.route({
      method: 'GET',
      path: '/registered-first',
      handler: (request) => ({
        isAuthenticated: request.auth.isAuthenticated
      })
    })

    await server.register(pluginAuth)

    const response = await server.inject({
      method: 'GET',
      url: '/registered-first'
    })

    expect(response.result).toEqual({ isAuthenticated: true })
  })
})
