import { type Server } from '@hapi/hapi'

import { config } from '~/src/config/index.js'
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

    const { container } = await renderResponse(server, options)

    const $heading = container.getByRole('heading', {
      name: 'Cookies',
      level: 1
    })

    expect($heading).toBeInTheDocument()
    expect($heading).toHaveClass('govuk-heading-l')
  })

  test('accessibility statement page is served', async () => {
    const options = {
      method: 'GET',
      url: '/help/accessibility-statement'
    }

    const { container } = await renderResponse(server, options)

    const $heading = container.getByRole('heading', {
      name: 'Accessibility statement for this form',
      level: 1
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

  test('Service banner is not shown by default', async () => {
    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/'
    })

    const $banner = container.queryByRole('complementary', {
      name: 'Service status'
    })

    expect($banner).not.toBeInTheDocument()
  })

  test('Service banner is not shown when empty', async () => {
    config.set('serviceBannerText', '')

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/'
    })

    const $banner = container.queryByRole('complementary', {
      name: 'Service status'
    })

    expect($banner).not.toBeInTheDocument()
  })

  test('Service banner is shown when configured', async () => {
    config.set('serviceBannerText', 'Hello world')

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/'
    })

    const $banner = container.getByRole('complementary', {
      name: 'Service status'
    })

    expect($banner).toHaveTextContent('Hello world')
  })
})
