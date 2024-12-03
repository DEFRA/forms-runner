import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

const { FEEDBACK_LINK } = process.env
const testDir = dirname(fileURLToPath(import.meta.url))
const basePath = '/feedback'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Feedback link', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'feedback.json',
      formFilePath: join(testDir, 'definitions')
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  it.each([
    {
      // Default feedback link
      url: '/help/cookies',
      name: 'give your feedback (opens in new tab)',
      href: FEEDBACK_LINK
    },
    {
      // Email address from feedback.json
      url: `${basePath}/uk-passport`,
      name: 'give your feedback by email',
      href: 'mailto:test@feedback.cat'
    }
  ])("should match route '$url'", async ({ url, name, href }) => {
    const { container } = await renderResponse(server, {
      method: 'GET',
      url
    })

    const $phaseBanner = document.querySelector('.govuk-phase-banner')
    const $link = container.getByRole('link', { name })

    expect($link).toBeInTheDocument()
    expect($link).toHaveAttribute('href', href)
    expect($link).toHaveClass('govuk-link')

    expect($phaseBanner).toHaveAttribute('class', 'govuk-phase-banner')
    expect($phaseBanner).toContainElement($link)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
