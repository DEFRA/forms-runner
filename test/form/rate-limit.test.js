import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe('Rate limit', () => {
  /** @type {Server} */
  let server

  const options = {
    userLimit: 1,
    userCache: {
      expiresIn: 5000
    }
  }

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'basic-v1.json',
      formFilePath: join(testDir, 'definitions'),
      rateOptions: options
    })
    server.route({
      method: 'GET',
      path: '/start',
      handler: () => {
        return {}
      },
      options: {
        plugins: {
          'hapi-rate-limit': true
        }
      }
    })
  })

  afterAll(async () => {
    await server.stop()
  })

  test('plugin is registered during server start', async () => {
    await expect(server.initialize()).resolves.not.toThrow()

    expect(server.registrations).toEqual(
      expect.objectContaining({
        'hapi-rate-limit': expect.objectContaining({
          name: 'hapi-rate-limit',
          options
        })
      })
    )
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
