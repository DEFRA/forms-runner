import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const testDir = dirname(fileURLToPath(import.meta.url))
const basePath = '/titles'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Title and section title', () => {
  /** @type {Server} */
  let server

  /** @type {OutgoingHttpHeaders} */
  let headers

  beforeAll(async () => {
    server = await createServer({
      formFileName: 'titles.json',
      formFilePath: join(testDir, 'definitions')
    })

    await server.initialize()

    // Extract the session cookie
    headers = getCookieHeader(
      await server.inject({
        method: 'GET',
        url: `${basePath}/applicant-one`
      }),
      'session'
    )
  })

  afterAll(async () => {
    await server.stop()
  })

  it('does not render the section title if it is the same as the title', async () => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)

    const { container } = await renderResponse(server, {
      url: `${basePath}/applicant-one`
    })

    const $section = document.getElementById('section-title')
    const $heading = container.getByRole('heading', {
      name: 'Applicant 1',
      level: 1
    })

    expect($section).toBeNull()
    expect($heading).toBeInTheDocument()
    expect($heading).toHaveClass('govuk-heading-l')
  })

  it('render warning when notification email is not set', async () => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)

    const { container } = await renderResponse(server, {
      url: `${basePath}/applicant-one`
    })

    const $warning = container.queryByRole('link', {
      name: 'enter the email address (opens in new tab)'
    })

    expect($warning).toBeInTheDocument()
  })

  it('does not render the warning when notification email is set', async () => {
    jest.mocked(getFormMetadata).mockResolvedValue({
      ...fixtures.form.metadata,
      notificationEmail: 'defra@gov.uk'
    })

    const { container } = await renderResponse(server, {
      url: `${basePath}/applicant-one`
    })

    const $warning = container.queryByRole('link', {
      name: 'enter the email address (opens in new tab)'
    })

    expect($warning).not.toBeInTheDocument()
  })

  it('does render the section title if it is not the same as the title', async () => {
    const { container } = await renderResponse(server, {
      url: `${basePath}/applicant-one-address`,
      headers
    })

    const $section = container.getByRole('heading', {
      name: 'Applicant 1',
      level: 2
    })

    const $heading = container.getByRole('heading', {
      name: 'Address',
      level: 1
    })

    expect($section).toBeInTheDocument()
    expect($section).toHaveAttribute('id', 'section-title')

    expect($heading).toBeInTheDocument()
    expect($heading).toHaveClass('govuk-fieldset__heading')
  })

  it('does not render the section title if hideTitle is set to true', async () => {
    const { container } = await renderResponse(server, {
      url: `${basePath}/applicant-two`,
      headers
    })

    const $section = document.getElementById('section-title')
    const $heading = container.getByRole('heading', {
      name: 'Applicant 2 details',
      level: 1
    })

    expect($section).toBeNull()
    expect($heading).toBeInTheDocument()
    expect($heading).toHaveClass('govuk-heading-l')
  })

  it('render title with optional when there is single component in page and is selected as optional', async () => {
    const { container } = await renderResponse(server, {
      url: '/titles/applicant-one-address-optional',
      headers
    })

    const $heading = container.getByRole('heading', {
      name: 'Address (optional)',
      level: 1
    })

    expect($heading).toBeInTheDocument()
    expect($heading).toHaveClass('govuk-fieldset__heading')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { OutgoingHttpHeaders } from 'node:http'
 */
