import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { within } from '@testing-library/dom'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

const testDir = dirname(fileURLToPath(import.meta.url))

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe(`Phase banner`, () => {
  /** @type {Server} */
  let server

  afterEach(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  test('shows the server phase tag by default', async () => {
    server = await createServer({
      formFileName: 'phase-default.json',
      formFilePath: join(testDir, 'definitions')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: '/phase-default/first-page'
    }

    await renderResponse(server, options)

    const $phaseBanner = /** @type {HTMLElement} */ (
      document.querySelector('.govuk-phase-banner')
    )

    const $phaseTag = within($phaseBanner).getByRole('strong')
    expect($phaseTag).toHaveTextContent('Beta')
  })

  test('shows the form phase tag if provided', async () => {
    server = await createServer({
      formFileName: 'phase-alpha.json',
      formFilePath: join(testDir, 'definitions')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: '/phase-alpha/first-page'
    }

    await renderResponse(server, options)

    const $phaseBanner = /** @type {HTMLElement} */ (
      document.querySelector('.govuk-phase-banner')
    )

    const $phaseTag = within($phaseBanner).getByRole('strong')
    expect($phaseTag).toHaveTextContent('Alpha')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
