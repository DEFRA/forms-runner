import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

const testDir = dirname(fileURLToPath(import.meta.url))
const key = 'wqJmSf'

describe('TextField based conditions', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'text.json',
      formFilePath: resolve(testDir, '../form/definitions')
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('TextField is rendered', async () => {
    const options = {
      method: 'GET',
      url: '/text/first-page'
    }

    const { container } = await renderResponse(server, options)

    const $input = container.getByRole('textbox', {
      name: 'First page (optional)'
    })

    expect($input).toBeInTheDocument()
    expect($input).toHaveAttribute('id', key)
    expect($input).toHaveAttribute('name', key)
    expect($input).toHaveClass('govuk-input')
    expect($input).not.toHaveValue()
  })

  test('Testing POST /text/first-page without values does not redirect', async () => {
    const form = {}

    const res = await server.inject({
      method: 'POST',
      url: '/text/first-page',
      payload: form
    })

    expect(res.statusCode).toBe(200)
  })

  test('Testing POST /text/first-page with an empty string redirects correctly', async () => {
    const form = {
      [key]: ''
    }

    const res = await server.inject({
      method: 'POST',
      url: '/text/first-page',
      payload: form
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/text/second-page')
  })

  test('Testing POST /text/first-page with an string "other" redirects correctly', async () => {
    const form = {
      [key]: 'other'
    }

    const res = await server.inject({
      method: 'POST',
      url: '/text/first-page',
      payload: form
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/text/third-page')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
