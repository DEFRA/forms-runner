import { type Server } from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Routes', () => {
  let server: Server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('cookies page is served with 24 hour duration and GA info', async () => {
    config.set('sessionTimeout', 86400000)
    config.set('googleAnalyticsContainerId', '12345')

    const options = {
      method: 'GET',
      url: '/help/cookies/slug'
    }

    const { container } = await renderResponse(server, options)

    const $heading = container.getByRole('heading', {
      name: 'Cookies',
      level: 1
    })

    const $googleAnalyticsRowheader = container.getByRole('rowheader', {
      name: '_ga_123456789'
    })

    const $sessionDurationRow = container.getByRole('row', {
      name: 'session Remembers the information you enter When you close the browser, or after 1 day'
    })

    const $cookieConsentRow = container.getByRole('row', {
      name: 'cookieConsent Remembers your cookie preferences 1 year'
    })

    expect($heading).toBeInTheDocument()
    expect($heading).toHaveClass('govuk-heading-l')
    expect($googleAnalyticsRowheader).toBeInTheDocument()
    expect($sessionDurationRow).toBeInTheDocument()
    expect($cookieConsentRow).toBeInTheDocument()
  })

  test('cookies page is served without GA info', async () => {
    config.set('sessionTimeout', 86400000)
    config.reset('googleAnalyticsTrackingId')

    const options = {
      method: 'GET',
      url: '/help/cookies/slug'
    }

    const { container } = await renderResponse(server, options)

    const $heading = container.getByRole('heading', {
      name: 'Cookies',
      level: 1
    })
    const $googleAnalyticsRowheader = container.queryByRole('rowheader', {
      name: '_ga_123456789'
    })

    const $sessionDurationRow = container.getByRole('row', {
      name: 'session Remembers the information you enter When you close the browser, or after 1 day'
    })

    const $cookieConsentRow = container.queryByRole('row', {
      name: 'cookieConsent Remembers your cookie preferences 1 year'
    })

    expect($heading).toBeInTheDocument()
    expect($heading).toHaveClass('govuk-heading-l')
    expect($googleAnalyticsRowheader).not.toBeInTheDocument()
    expect($sessionDurationRow).toBeInTheDocument()
    expect($cookieConsentRow).not.toBeInTheDocument()
  })

  test('accessibility statement page is served', async () => {
    const options = {
      method: 'GET',
      url: '/help/accessibility-statement/slug'
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
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)

    const options = {
      method: 'GET',
      url: '/help/get-support/slug'
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(StatusCodes.OK)
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
