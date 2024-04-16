import createServer from '../../../src/server/index.js'
import config from '../../../src/server/config.js'

describe(`/health-check Route`, () => {
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
      url: '/forms-runner/health-check'
    }

    const { result } = await server.inject(options)

    expect(result.status).toBe('OK')
    expect(result.lastCommit).toBe('Last Commit')
    expect(result.lastTag).toBe('Last Tag')
    expect(typeof result.time).toBe('string')
  })
})
