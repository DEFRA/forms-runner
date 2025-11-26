import { join } from 'node:path'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/formsService.js')

describe('Feedback link', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'feedback.json',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  it('should match route', async () => {
    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/help/cookies/feedback'
    })

    const name = 'give your feedback (opens in new tab)'
    const href = '/form/csat?formId=661e4ca5039739ef2902b214'

    const $phaseBanner = document.querySelector('.govuk-phase-banner')
    const $link = container.getByRole('link', { name })

    expect($link).toBeInTheDocument()
    expect($link).toHaveAttribute('href', href)
    expect($link).toHaveClass('govuk-link')

    expect($phaseBanner).toBeInTheDocument()
    expect($phaseBanner).toContainElement($link)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
