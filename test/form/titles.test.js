import { join } from 'node:path'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = '/titles'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Title and section title', () => {
  /** @type {Server} */
  let server

  /** @type {string} */
  let csrfToken

  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  beforeAll(async () => {
    server = await createServer({
      formFileName: 'titles.json',
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

    // Submit answers for all pages
    for (const { path, payload } of [
      {
        path: '/applicant-one',
        payload: {
          crumb: csrfToken,
          firstNameOne: 'Firstname',
          middleNameOne: '',
          lastNameOne: 'Lastname'
        }
      },
      {
        path: '/applicant-one-address',
        payload: {
          crumb: csrfToken,
          addressOne__addressLine1: 'Richard Fairclough House',
          addressOne__addressLine2: 'Knutsford Road',
          addressOne__town: 'Warrington',
          addressOne__postcode: 'WA4 1HT'
        }
      },
      {
        path: '/applicant-two',
        payload: {
          crumb: csrfToken,
          firstNameTwo: 'Firstname',
          middleNameTwo: '',
          lastNameTwo: 'Lastname'
        }
      },
      {
        path: '/applicant-two-address-optional',
        payload: {
          crumb: csrfToken,
          addressTwo__addressLine1: '',
          addressTwo__addressLine2: '',
          addressTwo__town: '',
          addressTwo__postcode: ''
        }
      }
    ]) {
      await server.inject({
        url: `${basePath}${path}`,
        method: 'POST',
        headers,
        payload
      })
    }
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
      url: `${basePath}/applicant-two-address-optional`,
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
