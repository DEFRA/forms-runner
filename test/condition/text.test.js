import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

const testDir = dirname(fileURLToPath(import.meta.url))
const basePath = '/text'
const key = 'wqJmSf'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

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

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('TextField is rendered', async () => {
    const { container } = await renderResponse(server, {
      url: `${basePath}/first-page`
    })

    const $input = container.getByRole('textbox', {
      name: 'First page (optional)'
    })

    const $warning = container.getByRole('link', {
      name: 'enter the email address (opens in new tab)'
    })

    expect($warning).toBeInTheDocument()
    expect($input).toBeInTheDocument()
    expect($input).toHaveAttribute('id', key)
    expect($input).toHaveAttribute('name', key)
    expect($input).toHaveClass('govuk-input')
    expect($input).not.toHaveValue()
  })

  test('Testing POST /first-page without values does not redirect', async () => {
    const form = {}

    const res = await server.inject({
      url: `${basePath}/first-page`,
      method: 'POST',
      payload: form
    })

    expect(res.statusCode).toBe(200)
  })

  test('Testing POST /first-page with an empty string redirects correctly', async () => {
    const form = {
      [key]: ''
    }

    const res = await server.inject({
      url: `${basePath}/first-page`,
      method: 'POST',
      payload: form
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(`${basePath}/second-page`)
  })

  test('Testing POST /first-page with an string "other" redirects correctly', async () => {
    const form = {
      [key]: 'other'
    }

    const res = await server.inject({
      url: `${basePath}/first-page`,
      method: 'POST',
      payload: form
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(`${basePath}/third-page`)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
