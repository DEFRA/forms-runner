import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'cheerio'
import FormData from 'form-data'
import cookie from 'cookie'
import createServer from '../../../src/server/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe('CSRF', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server
  let csrfToken = ''
  const form = new FormData()
  form.append('licenceLength', 1)
  const options = () => {
    return {
      method: 'POST',
      url: '/basic-v0/start',
      headers: form.getHeaders(),
      payload: form.getBuffer()
    }
  }

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'basic-v0.json',
      formFilePath: testDir,
      enforceCsrf: true
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('get request returns CSRF header', async () => {
    const options = {
      method: 'GET',
      url: '/basic-v0/start'
    }

    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
    const setCookieHeader = cookie.parse(
      response.headers['set-cookie'].find((header) => header.includes('crumb'))
    )
    expect(setCookieHeader).toBeTruthy()
    csrfToken = setCookieHeader.crumb
    expect(csrfToken).toBeTruthy()
    const $ = load(response.payload)
    expect($('[name=crumb]').val()).toEqual(csrfToken)
  })

  test('post request without CSRF token returns 403 forbidden', async () => {
    const response = await server.inject(options())
    expect(response.statusCode).toBe(403)
  }, 10000)

  test('post request with CSRF token returns 302 redirect', async () => {
    form.append('crumb', csrfToken)
    const csrfOptions = options()
    csrfOptions.headers = {
      ...options.headers,
      ...{
        cookie: `crumb=${csrfToken}`,
        'x-CSRF-token': csrfToken,
        ...form.getHeaders()
      }
    }
    const response = await server.inject(csrfOptions)
    expect(response.statusCode).toBe(302)
  }, 10000)
})
