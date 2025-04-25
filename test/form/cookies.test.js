import { join } from 'node:path'

import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe(`Cookie banner and analytics`, () => {
  /** @type {Server} */
  let server

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterEach(async () => {
    await server.stop()
  })

  test.each([
    `${FORM_PREFIX}/basic/licence`, // Form pages HAVE the prefix
    '/help/accessibility-statement/basic' // Help pages DO NOT have the prefix
  ])('shows the cookie banner by default', async (path) => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: path
    }

    const { container, document } = await renderResponse(server, options)

    const $cookieBanner = container.queryByRole('region', {
      name: 'Cookies on Submit a form to Defra'
    })

    const $gaScriptMain = document.getElementById('ga-tag-js-main')
    const $gaScriptInit = document.getElementById('ga-tag-js-init')

    expect($cookieBanner).toBeInTheDocument()
    expect($gaScriptMain).not.toBeInTheDocument()
    expect($gaScriptInit).not.toBeInTheDocument()
  })

  test.each([
    `${FORM_PREFIX}/basic/licence`, // Form pages HAVE the prefix
    '/help/accessibility-statement/basic' // Help pages DO NOT have the prefix
  ])('confirms when the user has accepted analytics cookies', async (path) => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()

    // set the cookie preferences
    const sessionInitialisationResponse = await server.inject({
      method: 'POST',
      url: `/help/cookie-preferences/basic?returnUrl=${encodeURIComponent('/mypage')}`,
      payload: {
        'cookies[analytics]': 'yes'
      }
    })

    const headers = getCookieHeader(sessionInitialisationResponse, [
      'crumb',
      'session',
      'cookieConsent'
    ])

    const { container, document } = await renderResponse(server, {
      method: 'GET',
      url: path,
      headers
    })

    const $cookieBanner = container.getByRole('region', {
      name: 'Cookies on Submit a form to Defra'
    })

    const $confirmationText = within($cookieBanner).getByText(
      'You’ve accepted analytics cookies.',
      { exact: false }
    )

    const $gaScriptMain = document.getElementById('ga-tag-js-main')
    const $gaScriptInit = document.getElementById('ga-tag-js-init')

    expect($cookieBanner).toBeInTheDocument()
    expect($confirmationText).toBeInTheDocument()
    expect($gaScriptMain).toBeInTheDocument()
    expect($gaScriptInit).toBeInTheDocument()
  })

  test.each([
    // form pages
    `${FORM_PREFIX}/basic/licence`,
    // non-form pages
    '/help/accessibility-statement/basic'
  ])('confirms when the user has rejected analytics cookies', async (path) => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()

    // set the cookie preferences
    const sessionInitialisationResponse = await server.inject({
      method: 'POST',
      url: `/help/cookie-preferences/basic?returnUrl=${encodeURIComponent('/mypage')}`,
      payload: {
        'cookies[analytics]': 'no'
      }
    })

    const headers = getCookieHeader(sessionInitialisationResponse, [
      'crumb',
      'session',
      'cookieConsent'
    ])

    const { container, document } = await renderResponse(server, {
      method: 'GET',
      url: path,
      headers
    })

    const $cookieBanner = container.getByRole('region', {
      name: 'Cookies on Submit a form to Defra'
    })

    const $confirmationText = within($cookieBanner).getByText(
      'You’ve rejected analytics cookies.',
      { exact: false }
    )

    const $gaScriptMain = document.getElementById('ga-tag-js-main')
    const $gaScriptInit = document.getElementById('ga-tag-js-init')

    expect($cookieBanner).toBeInTheDocument()
    expect($confirmationText).toBeInTheDocument()

    expect($gaScriptMain).not.toBeInTheDocument()
    expect($gaScriptInit).not.toBeInTheDocument()
  })

  test.each([
    // form pages
    `${FORM_PREFIX}/basic/start`
    // non-form pages
  ])('hides the cookie banner once dismissed', async (path) => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()

    // set the cookie preferences
    const sessionInitialisationResponse = await server.inject({
      method: 'POST',
      url: `/help/cookie-preferences/basic?returnUrl=${encodeURIComponent('/mypage')}`,
      payload: {
        'cookies[analytics]': 'yes',
        'cookies[dismissed]': 'yes'
      }
    })

    const headers = getCookieHeader(sessionInitialisationResponse, [
      'crumb',
      'session',
      'cookieConsent'
    ])

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: path,
      headers
    })

    const $cookieBanner = container.queryByRole('region', {
      name: 'Cookies on Submit a form to Defra'
    })

    expect($cookieBanner).not.toBeInTheDocument()
  })
})

describe(`Cookie preferences`, () => {
  /** @type {Server} */
  let server

  afterEach(async () => {
    await server.stop()
  })

  test.each([
    {
      value: 'yes',
      text: 'Yes'
    },
    {
      value: 'no',
      text: 'No'
    }
  ])(
    'selects the cookie preference automatically based on the user selection',
    async ({ text, value }) => {
      server = await createServer()
      await server.initialize()

      // set the cookie preferences
      const sessionInitialisationResponse = await server.inject({
        method: 'POST',
        url: `/help/cookie-preferences/basic`,
        payload: {
          'cookies[analytics]': value
        }
      })

      const headers = {
        Referer: '/help/cookie-preferences/basic',
        ...getCookieHeader(sessionInitialisationResponse, [
          'crumb',
          'session',
          'cookieConsent'
        ])
      }

      const { container } = await renderResponse(server, {
        method: 'GET',
        url: '/help/cookie-preferences/basic',
        headers
      })

      const $input = container.getByRole('radio', {
        name: text
      })

      const $successNotification = container.getByRole('alert', {
        name: 'Success'
      })

      expect($input).toBeChecked()
      expect($successNotification).toHaveTextContent(
        'You’ve set your cookie preferences.'
      )
    }
  )

  test("doesn't show the success banner if the user hasn't been posted from the cookie preferences page", async () => {
    server = await createServer()
    await server.initialize()

    // set the cookie preferences
    const sessionInitialisationResponse = await server.inject({
      method: 'POST',
      url: `/help/cookie-preferences/basic?returnUrl=${encodeURIComponent('/another-page')}`,
      payload: {
        'cookies[analytics]': 'yes'
      }
    })

    const headers = {
      ...getCookieHeader(sessionInitialisationResponse, [
        'crumb',
        'session',
        'cookieConsent'
      ])
    }

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/help/cookie-preferences/basic',
      headers
    })

    const $input = container.getByRole('radio', {
      name: 'Yes'
    })

    const $successNotification = container.queryByRole('alert', {
      name: 'Success'
    })

    expect($input).toBeChecked()
    expect($successNotification).not.toBeInTheDocument()
  })

  test('defaults to no if one is not provided', async () => {
    server = await createServer()
    await server.initialize()

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/help/cookie-preferences/basic'
    })

    const $input = container.getByRole('radio', {
      name: 'No'
    })

    expect($input).toBeChecked()
  })

  test('returns bad request for invalid redirect urls', async () => {
    server = await createServer()
    await server.initialize()

    const { response } = await renderResponse(server, {
      method: 'POST',
      url: `/help/cookie-preferences/basic?returnUrl=${encodeURIComponent('https://my-malicious-url.com')}`,
      payload: {
        'cookies[analytics]': 'yes'
      }
    })

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
