import { join } from 'node:path'

import { within } from '@testing-library/dom'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
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
    const basePath = `${FORM_PREFIX}/phase-default`

    server = await createServer({
      formFileName: 'phase-default.json',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()

    await renderResponse(server, {
      url: `${basePath}/first-page`
    })

    const $phaseBanner = /** @type {HTMLElement} */ (
      document.querySelector('.govuk-phase-banner')
    )

    const $phaseTag = within($phaseBanner).getByRole('strong')
    expect($phaseTag).toHaveTextContent('Beta')
  })

  test('shows the form phase tag if provided', async () => {
    const basePath = `${FORM_PREFIX}/phase-alpha`

    server = await createServer({
      formFileName: 'phase-alpha.json',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()

    await renderResponse(server, {
      url: `${basePath}/first-page`
    })

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
