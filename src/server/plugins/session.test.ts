import { Engine as CatboxMemory } from '@hapi/catbox-memory'
import hapi, { type ServerInjectResponse } from '@hapi/hapi'

import pluginSession from '~/src/server/plugins/session.js'

/**
 * The session cookie that a response sets, if any. yar sets it again each
 * time it writes the session to the cache, and the write starts the time
 * limit again.
 */
function sessionCookie(response: ServerInjectResponse) {
  return [response.headers['set-cookie'] ?? []]
    .flat()
    .find((cookie) => cookie.startsWith('session='))
}

describe('session plugin', () => {
  let server: hapi.Server

  beforeEach(async () => {
    server = hapi.server({
      cache: [{ name: 'session', engine: new CatboxMemory() }]
    })
    await server.register(pluginSession)

    server.route([
      { method: 'GET', path: '/page', handler: () => null },
      {
        method: 'GET',
        path: '/asset',
        options: { auth: false },
        handler: () => null
      }
    ])

    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  /**
   * Starts a session and returns the cookie header that sends it
   */
  async function startSession() {
    const response = await server.inject({ method: 'GET', url: '/page' })
    const cookie = sessionCookie(response)

    if (!cookie) {
      throw new Error('The first request did not start a session')
    }

    return { cookie: cookie.split(';')[0] }
  }

  it('writes the session on each request, so its time limit starts again', async () => {
    const headers = await startSession()

    const response = await server.inject({
      method: 'GET',
      url: '/page',
      headers
    })

    expect(sessionCookie(response)).toBeDefined()
  })

  it('does not write the session on a route with auth set to false', async () => {
    const headers = await startSession()

    const response = await server.inject({
      method: 'GET',
      url: '/asset',
      headers
    })

    expect(sessionCookie(response)).toBeUndefined()
  })
})
