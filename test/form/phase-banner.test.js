import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { within } from '@testing-library/dom'

import { createServer } from '~/src/server/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe(`Phase banner`, () => {
  /** @type {Server} */
  let server

  afterEach(async () => {
    await server.stop()
  })

  test('shows the beta tag by default', async () => {
    // For backwards-compatibility, as the main layout template currently always shows 'beta'.
    // TODO: default to no phase banner? TBD
    server = await createServer({
      formFileName: `phase-default.json`,
      formFilePath: join(testDir, 'definitions')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: '/phase-default/first-page'
    }

    const { document } = await renderResponse(server, options)

    const $phaseBanner = /** @type {HTMLElement} */ (
      document.querySelector('.govuk-phase-banner')
    )

    const $phaseTag = within($phaseBanner).getByRole('strong')
    expect($phaseTag).toHaveTextContent('Beta')
  })

  test('shows the alpha tag if selected', async () => {
    server = await createServer({
      formFileName: `phase-alpha.json`,
      formFilePath: join(testDir, 'definitions')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: '/phase-alpha/first-page'
    }

    const { document } = await renderResponse(server, options)

    const $phaseBanner = /** @type {HTMLElement} */ (
      document.querySelector('.govuk-phase-banner')
    )

    const $phaseTag = within($phaseBanner).getByRole('strong')
    expect($phaseTag).toHaveTextContent('Alpha')
  })

  test('does not show the phase banner if None', async () => {
    server = await createServer({
      formFileName: `phase-none.json`,
      formFilePath: join(testDir, 'definitions')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: '/phase-none/first-page'
    }

    const { document } = await renderResponse(server, options)

    const $phaseBanner = /** @type {HTMLElement} */ (
      document.querySelector('.govuk-phase-banner')
    )

    expect($phaseBanner).not.toBeInTheDocument()
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
