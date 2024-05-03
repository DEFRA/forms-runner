import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import FormData from 'form-data'
import { addDays, format } from 'date-fns'
import createServer from '../../../../../../../src/server/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))
const okStatusCode = 200
const redirectStatusCode = 302
const htmlContentType = 'text/html'
const key = 'wqJmSf'

describe('Date based conditions', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'date.json',
      formFilePath: testDir
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('Date is rendered', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/date/first-page'
    })

    expect(res.statusCode).toEqual(okStatusCode)
    expect(res.headers['content-type']).toContain(htmlContentType)
    expect(res.result).toContain(
      `<input class="govuk-input govuk-input--width-10" id="${key}" name="${key}" type="date">`
    )
  })

  test('Testing POST /date/first-page with 31 days in the future redirects correctly', async () => {
    const form = new FormData()
    const now = Date.now()
    const nowPlus31Days = format(addDays(now, 31), 'yyyy-MM-dd')

    form.append(key, nowPlus31Days)

    const res = await server.inject({
      method: 'POST',
      url: '/date/first-page',
      headers: form.getHeaders(),
      payload: form.getBuffer()
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/date/third-page')
  })

  test('Testing POST /date/first-page with 29 days in the future redirects correctly', async () => {
    const form = new FormData()
    const now = Date.now()
    const nowPlus29Days = format(addDays(now, 29), 'yyyy-MM-dd')

    form.append(key, nowPlus29Days)

    const res = await server.inject({
      method: 'POST',
      url: '/date/first-page',
      headers: form.getHeaders(),
      payload: form.getBuffer()
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/date/second-page')
  })

  test('Testing POST /checkboxes/first-page with "other" checked redirects correctly', async () => {
    const form = new FormData()
    form.append(key, 'other')

    const res = await server.inject({
      method: 'POST',
      url: '/checkboxes/first-page',
      headers: form.getHeaders(),
      payload: form.getBuffer()
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/checkboxes/third-page')
  })
})
