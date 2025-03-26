import { join } from 'node:path'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

const gaContainerId = 'ga-analytics-segment'
const gaText =
  'We use the system logs and Google Analytics data to create anonymised reports about the performance of forms that use'

describe(`Privacy policy`, () => {
  /** @type {Server} */
  let server

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterEach(async () => {
    await server.stop()
  })

  it('shows the GA text when enabled', async () => {
    config.set('googleAnalyticsTrackingId', '12345')
    config.set('serviceName', 'Submit a form to Defra')

    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: '/help/privacy/basic'
    }

    const { container, document } = await renderResponse(server, options)

    expect(document.getElementById(gaContainerId)).toBeInTheDocument()
    expect(
      container.getByText(
        (content) => content.includes(gaText) // saves copying the entire <p> block from the template
      )
    ).toBeInTheDocument()
  })

  it('hides the GA text when disabled', async () => {
    config.set('googleAnalyticsTrackingId', '')

    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: '/help/privacy/basic'
    }

    const { container, document } = await renderResponse(server, options)

    expect(document.getElementById(gaContainerId)).not.toBeInTheDocument()
    expect(container.queryByText(gaText)).not.toBeInTheDocument()
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
