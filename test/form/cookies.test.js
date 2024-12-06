/* eslint-disable jest/no-conditional-expect */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

  test('shows the cookie banner by default', async () => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(testDir, 'definitions')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: '/basic/start'
    }

    const { container } = await renderResponse(server, options)

    const $cookieBanner = container.queryByRole('region', {
      name: 'Cookies on Submit a form to Defra'
    })

    const $gaScriptMain = container.queryByTestId('ga-tag-js-main')
    const $gaScriptInit = container.queryByTestId('ga-tag-js-init')

    expect($cookieBanner).toBeInTheDocument()
    expect($gaScriptMain).not.toBeInTheDocument()
    expect($gaScriptInit).not.toBeInTheDocument()
  })

  test.each([
    {
      answer: 'yes',
      isGaEnabled: true
    },
    {
      answer: 'no',
      isGaEnabled: false
    }
  ])(
    'hides the cookie banner when the user has made a decision',
    async ({ answer, isGaEnabled }) => {
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
          'cookies[additional]': answer
        }
      })

      const headers = getCookieHeader(sessionInitialisationResponse, [
        'crumb',
        'session'
      ])

      const { container } = await renderResponse(server, {
        method: 'GET',
        url: '/basic/start',
        headers
      })

      const $cookieBanner = container.queryByRole('region', {
        name: 'Cookies on Submit a form to Defra'
      })

      const $gaScriptMain = container.queryByTestId('ga-tag-js-main')
      const $gaScriptInit = container.queryByTestId('ga-tag-js-init')

      expect($cookieBanner).not.toBeInTheDocument()

      if (isGaEnabled) {
        expect($gaScriptMain).toBeInTheDocument()
        expect($gaScriptInit).toBeInTheDocument()
      } else {
        expect($gaScriptMain).not.toBeInTheDocument()
        expect($gaScriptInit).not.toBeInTheDocument()
      }
    }
  )
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
          'cookies[additional]': value
        }
      })

      const headers = getCookieHeader(sessionInitialisationResponse, [
        'crumb',
        'session'
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

  test("doesn't choose a preference if one is not provided", async () => {
    server = await createServer()
    await server.initialize()

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/help/cookie-preferences'
    })

    const $inputs = container.getAllByRole('radio')

    for (const $input of $inputs) {
      expect($input).not.toBeChecked()
    }
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
