import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import createServer from '~/src/server/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))
const okStatusCode = 200
const redirectStatusCode = 302
const htmlContentType = 'text/html'
const key = 'wqJmSf'

describe('Checkboxes based conditions', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'checkboxes.json',
      formFilePath: testDir
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('Checkboxes are rendered', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/checkboxes/first-page'
    })

    expect(res.statusCode).toEqual(okStatusCode)
    expect(res.headers['content-type']).toContain(htmlContentType)
    expect(res.result).toContain(
      `<input class="govuk-checkboxes__input" id="${key}" name="${key}" type="checkbox" value="shire">`
    )
    expect(res.result).toContain(
      `<input class="govuk-checkboxes__input" id="${key}-2" name="${key}" type="checkbox" value="race">`
    )
    expect(res.result).toContain(
      `<input class="govuk-checkboxes__input" id="${key}-3" name="${key}" type="checkbox" value="pantomime">`
    )
    expect(res.result).toContain(
      `<input class="govuk-checkboxes__input" id="${key}-4" name="${key}" type="checkbox" value="other">`
    )
  })

  test('Testing POST /checkboxes/first-page with nothing checked redirects correctly', async () => {
    const form = {}

    const res = await server.inject({
      method: 'POST',
      url: '/checkboxes/first-page',
      payload: form
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/checkboxes/second-page')
  })

  test('Testing POST /checkboxes/first-page with "other" checked redirects correctly', async () => {
    const form = {
      [key]: 'other'
    }

    const res = await server.inject({
      method: 'POST',
      url: '/checkboxes/first-page',
      payload: form
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/checkboxes/third-page')
  })
})
