import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from 'cheerio'
import cookie from 'cookie'

import { createServer } from '~/src/server/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe('CSRF', () => {
  /** @type {Server} */
  let server

  /**
   * @param {Partial<ServerInjectOptions>} [opts]
   * @returns {ServerInjectOptions}
   */
  const options = (opts) => {
    return {
      method: 'POST',
      url: '/basic-v0/start',
      payload: {
        licenceLength: '1'
      },
      ...opts
    }
  }

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'basic-v0.json',
      formFilePath: join(testDir, 'definitions'),
      enforceCsrf: true
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('get request returns CSRF header', async () => {
    const response = await server.inject(
      options({
        method: 'GET',
        payload: undefined
      })
    )

    const cookies = [response.headers['set-cookie']].flat()
    const header = cookies.find((header) => header?.includes('crumb=')) ?? ''

    const { crumb: csrfToken } = cookie.parse(header)
    expect(csrfToken).toBeTruthy()

    expect(response.statusCode).toBe(200)
    expect(response.headers['set-cookie']).toContain(
      `crumb=${csrfToken}; HttpOnly; SameSite=Strict; Path=/`
    )

    const $ = load(response.payload)
    expect($('[name=crumb]').val()).toEqual(csrfToken)
  })

  test('post request without CSRF token returns 403 forbidden', async () => {
    const response = await server.inject(options())
    expect(response.statusCode).toBe(403)
  })

  test('post request with CSRF token returns 302 redirect', async () => {
    const csrfToken = 'dummy-token'

    const response = await server.inject(
      options({
        headers: {
          cookie: `crumb=${csrfToken}`
        },
        payload: {
          crumb: csrfToken,
          licenceLength: '1'
        }
      })
    )

    expect(response.statusCode).toBe(302)
  })
})

/**
 * @import { Server, ServerInjectOptions } from '@hapi/hapi'
 */
