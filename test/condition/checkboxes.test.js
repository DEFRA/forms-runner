import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

const testDir = dirname(fileURLToPath(import.meta.url))
const key = 'wqJmSf'

describe('Checkboxes based conditions', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'checkboxes.json',
      formFilePath: resolve(testDir, '../form/definitions')
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('Checkboxes are rendered', async () => {
    const options = {
      method: 'GET',
      url: '/checkboxes/first-page'
    }

    const { container } = await renderResponse(server, options)

    for (const example of [
      {
        name: key,
        id: key,
        text: 'Shire',
        value: 'shire'
      },
      {
        name: key,
        id: `${key}-2`,
        text: 'Race',
        value: 'race'
      },
      {
        name: key,
        id: `${key}-3`,
        text: 'Pantomime',
        value: 'pantomime'
      },
      {
        name: key,
        id: `${key}-4`,
        text: 'Other',
        value: 'other'
      }
    ]) {
      const $checkbox = container.getByRole('checkbox', {
        name: example.text
      })

      expect($checkbox).toBeInTheDocument()
      expect($checkbox).toHaveAttribute('id', example.id)
      expect($checkbox).toHaveAttribute('name', example.name)
      expect($checkbox).toHaveAttribute('value', example.value)
      expect($checkbox).toHaveClass('govuk-checkboxes__input')
      expect($checkbox).not.toBeChecked()
    }
  })

  test('Testing POST /checkboxes/first-page with nothing checked redirects correctly', async () => {
    const form = {}

    const res = await server.inject({
      method: 'POST',
      url: '/checkboxes/first-page',
      payload: form
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/checkboxes/second-page')
  })

  test('Testing POST /checkboxes/first-page with "other" checked redirects correctly', async () => {
    const form = {
      [key]: 'other'
    }

    const res = await server.inject({
      method: 'POST',
      url: '/checkboxes/first-page',
      payload: form
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/checkboxes/third-page')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
