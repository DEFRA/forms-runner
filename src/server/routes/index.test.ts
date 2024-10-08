import { type Server } from '@hapi/hapi'
import { within } from '@testing-library/dom'

import { createServer } from '~/src/server/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

describe('Routes', () => {
  let server: Server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('cookies page is served', async () => {
    const options = {
      method: 'GET',
      url: '/help/cookies'
    }

    const { document } = await renderResponse(server, options)

    const $heading = within(document.body).getByRole('heading', {
      name: 'Cookies'
    })

    expect($heading).toBeInTheDocument()
    expect($heading).toHaveClass('govuk-heading-l')
  })

  test('accessibility statement page is served', async () => {
    const options = {
      method: 'GET',
      url: '/help/accessibility-statement'
    }

    const { document } = await renderResponse(server, options)

    const $heading = within(document.body).getByRole('heading', {
      name: 'Accessibility statement for this form'
    })

    expect($heading).toBeInTheDocument()
    expect($heading).toHaveClass('govuk-heading-l')
  })

  test('Help page is served', async () => {
    const options = {
      method: 'GET',
      url: '/help/get-support'
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(200)
  })
})
