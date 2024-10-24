import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { hasRepeater } from '@defra/forms-model'
import { within } from '@testing-library/dom'

import { createServer } from '~/src/server/index.js'
import { ADD_ANOTHER, CONTINUE } from '~/src/server/plugins/engine/helpers.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const testDir = dirname(fileURLToPath(import.meta.url))

const okStatusCode = 200
const redirectStatusCode = 302
const notFoundStatusCode = 404

const url = '/repeat/pizza-order'

/**
 * POST a new repeat item
 * @param {Server} server
 * @param {PageRepeat} repeatPage
 * @param {number} [expectedItemCount]
 * @param {OutgoingHttpHeaders} [headers]
 */
async function createRepeatItem(
  server,
  repeatPage,
  expectedItemCount = 1,
  headers
) {
  const options = {
    method: 'POST',
    url,
    headers,
    payload: {
      sQsXKK: 'Ham',
      VcmoiL: 2
    }
  }

  const res1 = await server.inject(options)

  expect(res1.statusCode).toBe(redirectStatusCode)
  expect(res1.headers.location).toBe('/repeat/pizza-order/summary')

  const repeatName = repeatPage.repeat.options.name

  // Extract the session cookie
  const request = res1.request
  const { cacheService } = request.services([])
  const state = await cacheService.getState(request)
  const listState = state[repeatName]

  if (!Array.isArray(listState) || listState.length !== expectedItemCount) {
    throw new Error('Unexpected list state')
  }

  return {
    item: listState[listState.length - 1],
    headers: headers ?? getCookieHeader(res1, 'session')
  }
}

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Repeat GET tests', () => {
  /** @type {Server} */
  let server

  /** @type {PageRepeat} */
  let repeatPage

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'repeat.json',
      formFilePath: resolve(testDir, '../form/definitions')
    })

    const model = server.app.model
    const page = model?.def.pages[0]

    if (!hasRepeater(page)) {
      throw new Error('Unexpected controller type')
    }

    repeatPage = page

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /repeat/pizza-order returns 200', async () => {
    const options = {
      method: 'GET',
      url
    }

    const { container, response } = await renderResponse(server, options)
    expect(response.statusCode).toBe(okStatusCode)

    const $heading1 = container.getByRole('heading', {
      name: 'Pizza order',
      level: 1
    })

    const $heading2 = container.getByRole('heading', {
      name: 'Pizza 1',
      level: 2
    })

    expect($heading1).toBeInTheDocument()
    expect($heading1).toHaveClass('govuk-heading-l')

    expect($heading2).toBeInTheDocument()
    expect($heading2).toHaveClass('govuk-caption-l')
  })

  test('GET /repeat/pizza-order/summary returns 200', async () => {
    const options = {
      method: 'GET',
      url: `${url}/summary`
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(okStatusCode)
  })

  test('GET /repeat/pizza-order/{id} returns 200', async () => {
    const { item, headers } = await createRepeatItem(server, repeatPage)
    const res = await server.inject({
      method: 'GET',
      url: `${url}/${item.itemId}`,
      headers
    })

    expect(res.statusCode).toBe(okStatusCode)
  })

  test('GET /repeat/pizza-order/{id}/confirm-delete returns 200', async () => {
    const { item, headers } = await createRepeatItem(server, repeatPage)
    const res = await server.inject({
      method: 'GET',
      url: `${url}/${item.itemId}/confirm-delete`,
      headers
    })

    expect(res.statusCode).toBe(okStatusCode)
  })

  test('GET /repeat/pizza-order/{id}/confirm-delete with unknown itemId returns 404', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `${url}/00000000-0000-0000-0000-000000000000/confirm-delete`
    })

    expect(res.statusCode).toBe(notFoundStatusCode)
  })

  test('GET /repeat/pizza-order/summary with items returns 200', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)
    await createRepeatItem(server, repeatPage, 2, headers)

    const options = {
      method: 'GET',
      url: `${url}/summary`,
      headers
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(okStatusCode)
  })
})

describe('Repeat POST tests', () => {
  /** @type {Server} */
  let server

  /** @type {PageRepeat} */
  let repeatPage

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'repeat.json',
      formFilePath: resolve(testDir, '../form/definitions')
    })

    const model = server.app.model
    const page = model?.def.pages[0]

    if (!hasRepeater(page)) {
      throw new Error('Unexpected controller type')
    }

    repeatPage = page

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('POST /repeat/pizza-order/{id} returns 302', async () => {
    const { item, headers } = await createRepeatItem(server, repeatPage)
    const res = await server.inject({
      method: 'POST',
      url: `${url}/${item.itemId}`,
      headers,
      payload: {
        sQsXKK: 'Ham',
        VcmoiL: 3
      }
    })

    expect(res.statusCode).toBe(redirectStatusCode)
    expect(res.headers.location).toBe('/repeat/pizza-order/summary')
  })

  test('POST /repeat/pizza-order/{id}/confirm-delete returns 302', async () => {
    const { item, headers } = await createRepeatItem(server, repeatPage)
    const res = await server.inject({
      method: 'POST',
      url: `${url}/${item.itemId}/confirm-delete`,
      headers,
      payload: {
        confirm: true
      }
    })

    expect(res.statusCode).toBe(redirectStatusCode)
    expect(res.headers.location).toBe('/repeat/pizza-order/summary')
  })

  test('POST /repeat/pizza-order/summary ADD_ANOTHER returns 302', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `${url}/summary`,
      payload: {
        action: ADD_ANOTHER
      }
    })

    expect(res.statusCode).toBe(redirectStatusCode)
    expect(res.headers.location).toBe('/repeat/pizza-order')
  })

  test('POST /repeat/pizza-order/summary CONTINUE returns 302', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)

    const res = await server.inject({
      method: 'POST',
      url: `${url}/summary`,
      headers,
      payload: {
        action: CONTINUE
      }
    })

    expect(res.statusCode).toBe(redirectStatusCode)
    expect(res.headers.location).toBe('/repeat/summary')
  })

  test('POST /repeat/pizza-order/summary ADD_ANOTHER returns 200 with errors over schema.max', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)
    await createRepeatItem(server, repeatPage, 2, headers)

    const { container, response } = await renderResponse(server, {
      method: 'POST',
      url: `${url}/summary`,
      headers,
      payload: {
        action: ADD_ANOTHER
      }
    })

    expect(response.statusCode).toBe(okStatusCode)

    const $errorSummary = container.getByRole('alert')
    const $errorItems = within($errorSummary).getAllByRole('listitem')

    const $heading = within($errorSummary).getByRole('heading', {
      name: 'There is a problem',
      level: 2
    })

    expect($heading).toBeInTheDocument()
    expect($errorItems[0]).toHaveTextContent('You can only add up to 2 Pizzas')
  })

  test('POST /repeat/pizza-order/summary CONTINUE returns 302 to /summary', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)

    const res = await server.inject({
      method: 'POST',
      url: `${url}/summary`,
      headers,
      payload: {
        action: CONTINUE
      }
    })

    expect(res.statusCode).toBe(redirectStatusCode)
    expect(res.headers.location).toBe('/repeat/summary')

    const { container, response } = await renderResponse(server, {
      method: 'GET',
      url: '/repeat/summary',
      headers,
      payload: {
        action: CONTINUE
      }
    })

    expect(response.statusCode).toBe(okStatusCode)

    const $values = container
      .getAllByRole('definition')
      .filter(({ classList }) =>
        classList.contains('govuk-summary-list__value')
      )

    expect($values[0]).toHaveTextContent('You added 1 Pizza')
  })

  test('POST /repeat/pizza-order/summary with 2 items CONTINUE returns 302 to /summary', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)
    await createRepeatItem(server, repeatPage, 2, headers)

    const res = await server.inject({
      method: 'POST',
      url: `${url}/summary`,
      headers,
      payload: {
        action: CONTINUE
      }
    })

    expect(res.statusCode).toBe(redirectStatusCode)
    expect(res.headers.location).toBe('/repeat/summary')

    const { container, response } = await renderResponse(server, {
      method: 'GET',
      url: '/repeat/summary',
      headers,
      payload: {
        action: CONTINUE
      }
    })

    expect(response.statusCode).toBe(okStatusCode)

    const $values = container
      .getAllByRole('definition')
      .filter(({ classList }) =>
        classList.contains('govuk-summary-list__value')
      )

    expect($values[0]).toHaveTextContent('You added 2 Pizzas')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { PageRepeat } from '@defra/forms-model'
 * @import { OutgoingHttpHeaders } from 'node:http'
 */
