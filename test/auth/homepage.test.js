import { join } from 'node:path'

import Boom from '@hapi/boom'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'

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
})

/**
 * @import { Server } from '@hapi/hapi'
 */
