import { join } from 'node:path'

import Boom from '@hapi/boom'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/formsService.js')

describe('per-form homepage', () => {
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
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  it('sends a signed-out citizen to sign in first', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/homepage/test-form'
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      '/login?returnTo=%2Fhomepage%2Ftest-form'
    )
  })

  it('answers 404 for a form that does not exist', async () => {
    jest.mocked(getFormMetadata).mockRejectedValue(Boom.notFound())

    const response = await server.inject({
      method: 'GET',
      url: '/homepage/no-such-form'
    })

    expect(response.statusCode).toBe(404)
  })

  it('shows the caption, the form name and the start button to a signed-in citizen', async () => {
    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/homepage/test-form',
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

    expect(
      container.getByRole('heading', { name: 'Test form', level: 1 })
    ).toBeInTheDocument()

    const $start = container.getByRole('button', { name: 'Start a new form' })
    expect($start).toHaveAttribute('href', '/form/test-form')
  })

  it('shows the signed-in citizen’s email and a way out', async () => {
    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/homepage/test-form',
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

    expect(
      container.getByRole('link', { name: 'citizen@example.com' })
    ).toHaveAttribute('href', '/homepage/test-form')
    expect(container.getByRole('link', { name: 'Sign out' })).toHaveAttribute(
      'href',
      '/logout?slug=test-form'
    )
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
