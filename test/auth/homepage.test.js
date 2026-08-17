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

  it('shows the signed-in citizen’s email, linked to their homepage', async () => {
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
  })

  it('shows a signed-out citizen no account control, on a page that does not gate on auth', async () => {
    // The account header has no signed-out state — it exists to say who is
    // signed in — so a signed-out citizen gets the header this service has
    // always shown. They reach sign in through a page that requires it.
    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/help/accessibility-statement/test-form'
    })

    expect(
      container.queryByRole('link', { name: 'citizen@example.com' })
    ).not.toBeInTheDocument()
  })

  it('shows no account control at all when the sign-in feature is off', async () => {
    config.set('useSignInFeature', false)

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/help/accessibility-statement/test-form'
    })

    config.set('useSignInFeature', true)

    expect(
      container.getByRole('heading', {
        name: 'Accessibility statement for this form',
        level: 1
      })
    ).toBeInTheDocument()
    expect(
      container.queryByRole('link', { name: 'Sign in' })
    ).not.toBeInTheDocument()
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
