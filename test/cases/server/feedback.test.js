import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import cheerio from 'cheerio'
import createServer from '../../../src/server/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe(`Feedback`, () => {
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: `feedback.json`,
      formFilePath: testDir
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })
  test('get request returns configured form page', async () => {
    const options = {
      method: 'GET',
      url: `/forms-runner/feedback/uk-passport`
    }

    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')

    const $ = cheerio.load(response.payload)

    expect($('.govuk-phase-banner__text .govuk-link').attr('href')).toBe(
      'mailto:test@feedback.cat'
    )
  })
})
