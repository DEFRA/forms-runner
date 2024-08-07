import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from 'cheerio'

import { createServer } from '~/src/server/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe(`Phase banner`, () => {
  /** @type {Server} */
  let server

  afterEach(async () => {
    await server.stop()
  })

  test('shows the beta tag by default', async () => {
    // For backwards-compatibility, as the main layout template currently always shows 'beta'.
    // TODO: default to no phase banner? TBD
    server = await createServer({
      formFileName: `phase-default.json`,
      formFilePath: join(testDir, 'definitions')
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

  test('shows the alpha tag if selected', async () => {
    server = await createServer({
      formFileName: `phase-alpha.json`,
      formFilePath: join(testDir, 'definitions')
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

  test('does not show the phase banner if None', async () => {
    server = await createServer({
      formFileName: `phase-none.json`,
      formFilePath: join(testDir, 'definitions')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: '/phase-none/first-page'
    }

    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)

    const $ = load(response.payload)

    expect($('.govuk-phase-banner').html()).toBeNull()
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
