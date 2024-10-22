import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

const testDir = dirname(fileURLToPath(import.meta.url))
const key = 'wqJmSf'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Radio based conditions', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'radios.json',
      formFilePath: resolve(testDir, '../form/definitions')
    })
    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('Radio are rendered', async () => {
    const options = {
      method: 'GET',
      url: '/radios/first-page'
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
      const $radio = container.getByRole('radio', {
        name: example.text
      })

      expect($radio).toBeInTheDocument()
      expect($radio).toHaveAttribute('id', example.id)
      expect($radio).toHaveAttribute('name', example.name)
      expect($radio).toHaveAttribute('value', example.value)
      expect($radio).toHaveClass('govuk-radios__input')
      expect($radio).not.toBeChecked()
    }
  })

  test('Testing POST /radios/first-page with nothing checked redirects correctly', async () => {
    const form = {}

    const res = await server.inject({
      method: 'POST',
      url: '/radios/first-page',
      payload: form
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/radios/second-page')
  })

  test('Testing POST /radios/first-page with "other" checked redirects correctly', async () => {
    const form = {
      [key]: 'other'
    }

    const res = await server.inject({
      method: 'POST',
      url: '/radios/first-page',
      payload: form
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/radios/third-page')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
