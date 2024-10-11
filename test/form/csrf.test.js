import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie } from '~/test/utils/get-cookie.js'

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
      url: '/basic/start',
      payload: {
        licenceLength: '1'
      },
      ...opts
    }
  }

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'basic.json',
      formFilePath: join(testDir, 'definitions'),
      enforceCsrf: true
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('get request returns CSRF header', async () => {
    const { response } = await renderResponse(
      server,
      options({
        method: 'GET',
        payload: undefined
      })
    )

    expect(response.statusCode).toBe(200)

    const csrfToken = getCookie(response, 'crumb')
    expect(csrfToken).toBeTruthy()

    const $input = document.querySelector('[name=crumb]')
    expect($input).toBeInTheDocument()
    expect($input).toHaveAttribute('type', 'hidden')
    expect($input).toHaveValue(csrfToken)
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
