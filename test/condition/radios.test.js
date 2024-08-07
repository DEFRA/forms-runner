import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))
const okStatusCode = 200
const redirectStatusCode = 302
const htmlContentType = 'text/html'
const key = 'wqJmSf'

describe('Radio based conditions', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'radios.json',
      formFilePath: resolve(testDir, '../form/definitions')
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('Radio are rendered', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/radios/first-page'
    })

    expect(res.statusCode).toEqual(okStatusCode)
    expect(res.headers['content-type']).toContain(htmlContentType)
    expect(res.result).toContain(
      `<input class="govuk-radios__input" id="${key}" name="${key}" type="radio" value="shire">`
    )
    expect(res.result).toContain(
      `<input class="govuk-radios__input" id="${key}-2" name="${key}" type="radio" value="race">`
    )
    expect(res.result).toContain(
      `<input class="govuk-radios__input" id="${key}-3" name="${key}" type="radio" value="pantomime">`
    )
    expect(res.result).toContain(
      `<input class="govuk-radios__input" id="${key}-4" name="${key}" type="radio" value="other">`
    )
  })

  test('Testing POST /radios/first-page with nothing checked redirects correctly', async () => {
    const form = {}

    const res = await server.inject({
      method: 'POST',
      url: '/radios/first-page',
      payload: form
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/radios/second-page')
  })

  test('Testing POST /radios/first-page with "other" checked redirects correctly', async () => {
    const form = {
      [key]: 'other'
    }

    const res = await server.inject({
      method: 'POST',
      url: '/radios/first-page',
      payload: form
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/radios/third-page')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
