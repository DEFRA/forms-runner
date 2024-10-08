import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { within } from '@testing-library/dom'

import { createServer } from '~/src/server/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getSessionCookie } from '~/test/utils/get-session-cookie.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe('Title and section title', () => {
  /** @type {Server} */
  let server

  /** @type {string} */
  let cookie

  beforeAll(async () => {
    server = await createServer({
      formFileName: 'titles.json',
      formFilePath: join(testDir, 'definitions')
    })

    await server.initialize()

    // Extract the session cookie
    cookie = getSessionCookie(
      await server.inject({
        method: 'GET',
        url: '/titles/applicant-one'
      })
    )
  })

  afterAll(async () => {
    await server.stop()
  })

  it('does not render the section title if it is the same as the title', async () => {
    const options = {
      method: 'GET',
      url: '/titles/applicant-one'
    }

    const { document } = await renderResponse(server, options)

    const $section = document.getElementById('section-title')
    const $heading = within(document.body).getByRole('heading', {
      name: 'Applicant 1',
      level: 1
    })

    expect($section).toBeNull()
    expect($heading).toBeInTheDocument()
    expect($heading).toHaveClass('govuk-heading-l')
  })

  it('does render the section title if it is not the same as the title', async () => {
    const options = {
      method: 'GET',
      url: '/titles/applicant-one-address',
      headers: { cookie }
    }

    const { document } = await renderResponse(server, options)

    const $section = within(document.body).getByRole('heading', {
      name: 'Applicant 1',
      level: 2
    })

    const $heading = within(document.body).getByRole('heading', {
      name: 'Address',
      level: 1
    })

    expect($section).toBeInTheDocument()
    expect($section).toHaveAttribute('id', 'section-title')

    expect($heading).toBeInTheDocument()
    expect($heading).toHaveClass('govuk-fieldset__heading')
  })

  it('Does not render the section title if hideTitle is set to true', async () => {
    const options = {
      method: 'GET',
      url: '/titles/applicant-two',
      headers: { cookie }
    }

    const { document } = await renderResponse(server, options)

    const $section = document.getElementById('section-title')
    const $heading = within(document.body).getByRole('heading', {
      name: 'Applicant 2 details',
      level: 1
    })

    expect($section).toBeNull()
    expect($heading).toBeInTheDocument()
    expect($heading).toHaveClass('govuk-heading-l')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
