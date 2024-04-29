import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import createServer from '../../../../../../src/server/index.js'
import FormData from 'form-data'

const testDir = dirname(fileURLToPath(import.meta.url))
const okStatusCode = 200
const redirectStatusCode = 302
const htmlContentType = 'text/html'
const key = 'wqJmSf'

describe('TextField based conditions', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'text.json',
      formFilePath: testDir
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('TextField is rendered', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/text/first-page'
    })

    expect(res.statusCode).toEqual(okStatusCode)
    expect(res.headers['content-type']).toContain(htmlContentType)
    expect(res.result).toContain(
      `<input class="govuk-input govuk-input--width-20" id="${key}" name="${key}" type="text">`
    )
  })

  test('Testing POST /text/first-page with an nothing string redirects correctly', async () => {
    const form = new FormData()

    const res = await server.inject({
      method: 'POST',
      url: '/text/first-page',
      headers: form.getHeaders(),
      payload: form.getBuffer()
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/text/second-page')
  })

  test('Testing POST /text/first-page with an empty string redirects correctly', async () => {
    const form = new FormData()
    form.append(key, '')

    const res = await server.inject({
      method: 'POST',
      url: '/text/first-page',
      headers: form.getHeaders(),
      payload: form.getBuffer()
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/text/second-page')
  })

  test('Testing POST /text/first-page with an string "other" redirects correctly', async () => {
    const form = new FormData()
    form.append(key, 'other')

    const res = await server.inject({
      method: 'POST',
      url: '/text/first-page',
      headers: form.getHeaders(),
      payload: form.getBuffer()
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/text/third-page')
  })
})
