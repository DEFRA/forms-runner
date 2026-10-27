import { StatusCodes } from 'http-status-codes'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

describe('Auth routes', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    config.set('useSignInFeature', true)

    server = await createServer({
      enforceCsrf: false
    })
    await server.initialize()
  })

  const credentials = {
    iss: 'http://localhost:3011',
    sub: 'sub-1',
    email: 'citizen@example.com',
    idToken: 'header.payload.signature',
    accessToken: 'access-1',
    accessTokenExpiresAt: 1,
    refreshToken: 'refresh-old'
  }

  describe('GET /signin-required', () => {
    test('get route responds OK in en-GB', async () => {
      const options = {
        method: 'GET',
        url: '/signin-required?slug=my-slug&state=draft&isPreview=true',
        auth: { strategy: 'citizen-session', credentials }
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $heading = container.getByRole('heading', { level: 1 })

      expect($heading).toBeInTheDocument()
      expect($heading).toHaveTextContent('Sign in to use this form')
    })

    test('get route responds OK in cy', async () => {
      const options = {
        method: 'GET',
        url: '/signin-required?slug=my-slug&state=draft&isPreview=true&language=cy',
        auth: { strategy: 'citizen-session', credentials }
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $heading = container.getByRole('heading', { level: 1 })

      expect($heading).toBeInTheDocument()
      expect($heading).toHaveTextContent(
        "Mewngofnodwch i ddefnyddio'r ffurflen hon"
      )
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
