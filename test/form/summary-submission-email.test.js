import { join } from 'node:path'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/minimal`

jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')

describe('Page: /summary', () => {
  /** @type {Server} */
  let server

  /** @type {string} */
  let csrfToken

  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  beforeAll(async () => {
    server = await createServer({
      formFileName: 'minimal.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      enforceCsrf: true
    })

    await server.initialize()

    // Navigate to start
    const response = await server.inject({
      url: `${basePath}/start`,
      headers
    })

    // Extract the session cookie
    csrfToken = getCookie(response, 'crumb')
    headers = getCookieHeader(response, ['session', 'crumb'])

    // Submit answers
    await server.inject({
      url: `${basePath}/start`,
      method: 'POST',
      headers,
      payload: {
        crumb: csrfToken,
        field: 'value'
      }
    })
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  it('should render the page with email notification warning', async () => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)

    const { container } = await renderResponse(server, {
      url: `${basePath}/summary`,
      headers
    })

    const $warning = container.getByRole('link', {
      name: 'enter the email address (opens in new tab)'
    })

    expect($warning).toBeInTheDocument()
  })

  it('should render the page with no email notification warning', async () => {
    jest.mocked(getFormMetadata).mockResolvedValue({
      ...fixtures.form.metadata,
      notificationEmail: 'defra@gov.uk'
    })

    const { container } = await renderResponse(server, {
      url: `${basePath}/summary`,
      headers
    })

    const $warning = container.queryByRole('link', {
      name: 'enter the email address (opens in new tab)'
    })

    expect($warning).not.toBeInTheDocument()
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
