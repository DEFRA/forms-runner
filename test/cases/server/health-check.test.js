import config from '~/src/server/config.js'
import createServer from '~/src/server/index.js'

describe(`/health-check Route`, () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  beforeAll(async () => {
    config.lastCommit = 'Last Commit'
    config.lastTag = 'Last Tag'
    server = await createServer({})
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('/health-check route response is correct', async () => {
    const options = {
      method: 'GET',
      url: '/health-check'
    }

    const { result } = await server.inject(options)

    expect(result).toMatchObject({
      status: 'OK',
      lastCommit: 'Last Commit',
      lastTag: 'Last Tag',
      time: expect.any(String)
    })
  })
})
