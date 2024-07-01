import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from 'cheerio'

import { createServer } from '~/src/server/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe(`Phase banner`, () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  afterEach(async () => {
    await server.stop()
  })

  test('shows the server phase tag by default', async () => {
    server = await createServer({
      formFileName: `phase-default.json`,
      formFilePath: join(testDir, '/forms')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: '/phase-default/first-page'
    }

    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)

    const $ = load(response.payload)

    expect($('.govuk-phase-banner__content__tag').text().trim()).toBe('Beta')
  })

  test('shows the form phase tag if provided', async () => {
    server = await createServer({
      formFileName: `phase-alpha.json`,
      formFilePath: join(testDir, '/forms')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: '/phase-alpha/first-page'
    }

    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)

    const $ = load(response.payload)

    expect($('.govuk-phase-banner__content__tag').text().trim()).toBe('Alpha')
  })
})
