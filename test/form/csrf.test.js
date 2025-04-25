import { join } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/basic`

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('CSRF', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      enforceCsrf: true
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('get request returns CSRF header', async () => {
    const { response } = await renderResponse(server, {
      url: `${basePath}/licence`
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const csrfToken = getCookie(response, 'crumb')
    expect(csrfToken).toBeTruthy()

    const $input = document.querySelector('[name=crumb]')
    expect($input).toBeInTheDocument()
    expect($input).toHaveAttribute('type', 'hidden')
    expect($input).toHaveValue(csrfToken)
  })

  test('post request without CSRF token returns 403 forbidden', async () => {
    const response = await server.inject({
      url: `${basePath}/licence`,
      method: 'POST',
      payload: {
        licenceLength: '1'
      }
    })

    expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
  })

  test('post request with CSRF token returns 303 redirect', async () => {
    const csrfToken = 'dummy-token'

    const response = await server.inject({
      url: `${basePath}/licence`,
      method: 'POST',
      headers: {
        cookie: `crumb=${csrfToken}`
      },
      payload: {
        crumb: csrfToken,
        licenceLength: '1'
      }
    })

    expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
  })
})

/**
 * @import { Server, ServerInjectOptions } from '@hapi/hapi'
 */
