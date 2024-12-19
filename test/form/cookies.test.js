import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { within } from '@testing-library/dom'

import { createServer } from '~/src/server/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe(`Cookie banner and analytics`, () => {
  /** @type {Server} */
  let server

  afterEach(async () => {
    await server.stop()
  })

  test.each([
    '/basic/start', // form pages
    '/' // non-form pages
  ])('shows the cookie banner by default', async (path) => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(testDir, 'definitions')
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
    // form pages
    '/basic/start',
    // non-form pages
    '/'
  ])('confirms when the user has accepted analytics cookies', async (path) => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(testDir, 'definitions')
    })

    await server.initialize()

    // set the cookie preferences
    const sessionInitialisationResponse = await server.inject({
      method: 'POST',
      url: '/help/cookie-preferences',
      payload: {
        'cookies[analytics]': 'yes',
        returnUrl: '/mypage'
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
    '/basic/start',
    // non-form pages
    '/'
  ])('confirms when the user has rejected analytics cookies', async (path) => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(testDir, 'definitions')
    })

    await server.initialize()

    // set the cookie preferences
    const sessionInitialisationResponse = await server.inject({
      method: 'POST',
      url: '/help/cookie-preferences',
      payload: {
        'cookies[analytics]': 'no',
        returnUrl: '/mypage'
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
    '/basic/start',
    // non-form pages
    '/'
  ])('hides the cookie banner once dismissed', async (path) => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(testDir, 'definitions')
    })

    await server.initialize()

    // set the cookie preferences
    const sessionInitialisationResponse = await server.inject({
      method: 'POST',
      url: '/help/cookie-preferences',
      payload: {
        'cookies[analytics]': 'yes',
        'cookies[dismissed]': 'yes',
        returnUrl: '/mypage'
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
        url: '/help/cookie-preferences',
        payload: {
          'cookies[analytics]': value,
          returnUrl: '/mypage'
        }
      })

      const headers = getCookieHeader(sessionInitialisationResponse, [
        'crumb',
        'session',
        'cookieConsent'
      ])

      const { container } = await renderResponse(server, {
        method: 'GET',
        url: '/help/cookie-preferences',
        headers
      })

      const $input = container.getByRole('radio', {
        name: text
      })

      expect($input).toBeChecked()
    }
  )

  test('defaults to no if one is not provided', async () => {
    server = await createServer()
    await server.initialize()

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/help/cookie-preferences'
    })

    const $input = container.getByRole('radio', {
      name: 'No'
    })

    expect($input).toBeChecked()
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
