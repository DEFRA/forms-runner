import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from 'cheerio'

import { createServer } from '~/src/server/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe(`Feedback`, () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: `feedback.json`,
      formFilePath: join(testDir, 'definitions')
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })
  test('get request returns configured form page', async () => {
    const options = {
      method: 'GET',
      url: '/feedback/uk-passport'
    }

    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')

    const $ = load(response.payload)

    expect($('.govuk-phase-banner__text .govuk-link').attr('href')).toBe(
      'mailto:test@feedback.cat'
    )
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
