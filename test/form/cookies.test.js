import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe(`Analytics cookies`, () => {
  /** @type {Server} */
  let server

  afterEach(async () => {
    await server.stop()
  })

  test('shows the cookie banner by default', async () => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(testDir, 'definitions')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: '/basic/start'
    }

    await renderResponse(server, options)

    const $cookieBanner = /** @type {HTMLElement} */ (
      document.querySelector('.govuk-cookie-banner')
    )

    expect($cookieBanner).not.toBeNull()
  })

  test.each(['yes', 'no'])(
    'hides the cookie banner when the user has made a decision',
    async (answer) => {
      server = await createServer({
        formFileName: 'basic.js',
        formFilePath: join(testDir, 'definitions')
      })

      await server.initialize()

      // set the cookie preferences
      const sessionInitialisationResponse = await server.inject({
        method: 'POST',
        url: '/help/cookie-preferences',
        payload: {
          'cookies[additional]': answer
        }
      })

      const headers = getCookieHeader(sessionInitialisationResponse, [
        'crumb',
        'session'
      ])

      await renderResponse(server, {
        method: 'GET',
        url: '/basic/start',
        headers
      })

      const $cookieBanner = /** @type {HTMLElement} */ (
        document.querySelector('.govuk-cookie-banner')
      )

      expect($cookieBanner).toBeNull()
    }
  )
})

/**
 * @import { Server } from '@hapi/hapi'
 */
