import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

const testDir = dirname(fileURLToPath(import.meta.url))

jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')

describe('Page: /basic/summary', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer({
      formFileName: 'basic.json',
      formFilePath: join(testDir, 'definitions'),
      enforceCsrf: true
    })

    await server.initialize()
  })

  it('should render the page with email notification warning', async () => {
    const options = {
      method: 'GET',
      url: '/basic/summary'
    }

    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)

    const { container } = await renderResponse(server, options)

    const $warning = container.getByRole('link', {
      name: 'enter the email address (opens in new tab)'
    })

    expect($warning).toBeInTheDocument()
  })

  it('should render the page with no email notification warning', async () => {
    const options = {
      method: 'GET',
      url: '/basic/summary'
    }

    jest.mocked(getFormMetadata).mockResolvedValue({
      ...fixtures.form.metadata,
      notificationEmail: 'defra@gov.uk'
    })
    const { container } = await renderResponse(server, options)

    const $warning = container.queryByRole('link', {
      name: 'enter the email address (opens in new tab)'
    })

    expect($warning).not.toBeInTheDocument()
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
