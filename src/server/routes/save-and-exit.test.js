import { createServer } from '~/src/server/index.js'

describe('Save-and-exit check routes', () => {
  const startServer = async () => {
    const server = await createServer()
    await server.initialize()
    return server
  }

  /** @type {Server} */
  let server

  afterEach(async () => {
    await server.stop()
  })

  describe('GET /save-and-exit-resume/{formId}/{magicLinkId}', () => {
    test('/health route response is correct', async () => {
      server = await startServer()

      const options = {
        method: 'GET',
        url: '/health'
      }

      const { result } = await server.inject(options)

      expect(result).toMatchObject({
        message: 'success'
      })
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
