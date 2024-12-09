import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { hasRepeater } from '@defra/forms-model'
import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { createServer } from '~/src/server/index.js'
import { ADD_ANOTHER, CONTINUE } from '~/src/server/plugins/engine/helpers.js'
import { submit } from '~/src/server/plugins/engine/services/formSubmissionService.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')

const testDir = dirname(fileURLToPath(import.meta.url))
const basePath = '/repeat'

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
  headers,
  itemId = randomUUID()
) {
  // Issue a GET request to the item
  // page to add to the progress stack
  await server.inject({
    url: `${basePath}/pizza-order/${itemId}`,
    headers
  })

  const res1 = await server.inject({
    url: `${basePath}/pizza-order/${itemId}`,
    method: 'POST',
    headers,
    payload: {
      toppings: 'Ham',
      quantity: 2
    }
  })

  expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
  expect(res1.headers.location).toBe(
    `${basePath}/pizza-order/summary?itemId=${itemId}`
  )

  const repeatName = repeatPage.repeat.options.name

  // Extract the session cookie
  const request = res1.request
  const { cacheService } = request.services([])
  const state = await cacheService.getState(request)
  const listState = state[repeatName]

  if (!Array.isArray(listState) || listState.length !== expectedItemCount) {
    throw new Error('Unexpected list state')
  }

  const item = listState
    .filter((value) => typeof value === 'object' && 'itemId' in value)
    .at(-1)

  if (!item) {
    throw new Error('No item state found')
  }

  return {
    item,
    headers: headers ?? getCookieHeader(res1, 'session'),
    redirectLocation: res1.headers.location
  }
}

describe('Repeat GET tests', () => {
  /** @type {Server} */
  let server

  /** @type {PageRepeat} */
  let repeatPage

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'repeat.js',
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

  test('GET /pizza-order returns 302', async () => {
    const res = await server.inject({
      url: `${basePath}/pizza-order`
    })

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
  })

  test('GET /pizza-order/summary returns 200', async () => {
    const res = await server.inject({
      url: `${basePath}/pizza-order/summary`
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  test('GET /pizza-order/{id} returns 200', async () => {
    const { item, headers } = await createRepeatItem(server, repeatPage)

    const { container, response } = await renderResponse(server, {
      url: `${basePath}/pizza-order/${item.itemId}`,
      headers
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $heading1 = container.getByRole('heading', {
      name: 'Pizza order',
      level: 1
    })

    const $heading2 = container.getByRole('heading', {
      name: 'Food: Pizza 1',
      level: 2
    })

    expect($heading1).toBeInTheDocument()
    expect($heading1).toHaveClass('govuk-heading-l')

    expect($heading2).toBeInTheDocument()
    expect($heading2).toHaveClass('govuk-caption-l')
  })

  test('GET /pizza-order/{id} returns 200 with back link', async () => {
    const { item, headers, redirectLocation } = await createRepeatItem(
      server,
      repeatPage
    )

    if (!redirectLocation) {
      throw new Error('Unexpected empty redirectLocation')
    }

    // Visit the summary page to append to the progress stack to
    // ensure the back link is rendered on the next page request
    await server.inject({
      url: redirectLocation,
      headers
    })

    const { container, response } = await renderResponse(server, {
      url: `${basePath}/pizza-order/${item.itemId}`,
      headers
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $heading1 = container.getByRole('heading', {
      name: 'Pizza order',
      level: 1
    })

    const $heading2 = container.getByRole('heading', {
      name: 'Food: Pizza 1',
      level: 2
    })

    expect($heading1).toBeInTheDocument()
    expect($heading1).toHaveClass('govuk-heading-l')

    expect($heading2).toBeInTheDocument()
    expect($heading2).toHaveClass('govuk-caption-l')

    const $backLink = container.getByRole('link', {
      name: 'Back'
    })

    expect($backLink).toBeInTheDocument()
    expect($backLink).toHaveAttribute(
      'href',
      `${basePath}/pizza-order/summary?itemId=${item.itemId}`
    )
  })

  test('GET /pizza-order/{id}/confirm-delete returns 200', async () => {
    const { item, headers } = await createRepeatItem(server, repeatPage)

    const res = await server.inject({
      url: `${basePath}/pizza-order/${item.itemId}/confirm-delete`,
      headers
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  test('GET /pizza-order/{id}/confirm-delete with unknown itemId returns 404', async () => {
    const res = await server.inject({
      url: `${basePath}/pizza-order/00000000-0000-0000-0000-000000000000/confirm-delete`
    })

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
  })

  test('GET /pizza-order/summary with items returns 200', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)
    await createRepeatItem(server, repeatPage, 2, headers)

    const res = await server.inject({
      url: `${basePath}/pizza-order/summary`,
      headers
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
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
      formFileName: 'repeat.js',
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

  test('POST /pizza-order/{id} returns 303', async () => {
    const { item, headers } = await createRepeatItem(server, repeatPage)

    const res = await server.inject({
      url: `${basePath}/pizza-order/${item.itemId}`,
      method: 'POST',
      headers,
      payload: {
        toppings: 'Ham',
        quantity: 3
      }
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toMatch(/^\/repeat\/pizza-order\/summary?/)
  })

  test('POST /pizza-order/{id}/confirm-delete returns 303', async () => {
    const { item, headers } = await createRepeatItem(server, repeatPage)

    const res = await server.inject({
      url: `${basePath}/pizza-order/${item.itemId}/confirm-delete`,
      method: 'POST',
      headers,
      payload: {
        confirm: true
      }
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toMatch(/^\/repeat\/pizza-order\/summary/)
  })

  test('POST /pizza-order/summary ADD_ANOTHER returns 303', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `${basePath}/pizza-order/summary`,
      payload: {
        action: ADD_ANOTHER
      }
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/pizza-order`)
  })

  test('POST /pizza-order/summary CONTINUE returns 303', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)

    const res = await server.inject({
      url: `${basePath}/pizza-order/summary`,
      method: 'POST',
      headers,
      payload: {
        action: CONTINUE
      }
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/summary`)
  })

  test('POST /pizza-order/summary ADD_ANOTHER returns 200 with errors over schema.max', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)

    await createRepeatItem(server, repeatPage, 2, headers)

    const { container, response } = await renderResponse(server, {
      url: `${basePath}/pizza-order/summary`,
      method: 'POST',
      headers,
      payload: {
        action: ADD_ANOTHER
      }
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $errorSummary = container.getByRole('alert')
    const $errorItems = within($errorSummary).getAllByRole('listitem')

    const $heading = within($errorSummary).getByRole('heading', {
      name: 'There is a problem',
      level: 2
    })

    expect($heading).toBeInTheDocument()
    expect($errorItems[0]).toHaveTextContent('You can only add up to 2 Pizzas')
  })

  test('POST /pizza-order/summary CONTINUE returns 303 to /summary', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)

    const res = await server.inject({
      url: `${basePath}/pizza-order/summary`,
      method: 'POST',
      headers,
      payload: {
        action: CONTINUE
      }
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/summary`)

    const { container, response } = await renderResponse(server, {
      url: `${basePath}/summary`,
      headers,
      payload: {
        action: CONTINUE
      }
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $values = container
      .getAllByRole('definition')
      .filter(({ classList }) =>
        classList.contains('govuk-summary-list__value')
      )

    expect($values[0]).toHaveTextContent('You added 1 Pizza')
  })

  test('POST /pizza-order/summary with 2 items CONTINUE returns 303 to /summary', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)

    await createRepeatItem(server, repeatPage, 2, headers)

    const res1 = await server.inject({
      url: `${basePath}/pizza-order/summary`,
      method: 'POST',
      headers,
      payload: {
        action: CONTINUE
      }
    })

    expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res1.headers.location).toBe(`${basePath}/summary`)

    const { container, response: res2 } = await renderResponse(server, {
      url: `${basePath}/summary`,
      headers,
      payload: {
        action: CONTINUE
      }
    })

    expect(res2.statusCode).toBe(StatusCodes.OK)

    const $values = container
      .getAllByRole('definition')
      .filter(({ classList }) =>
        classList.contains('govuk-summary-list__value')
      )

    expect($values[0]).toHaveTextContent('You added 2 Pizzas')

    // POST the summary page
    await server.inject({
      method: 'POST',
      url: `${basePath}/summary`,
      headers
    })

    expect(submit).toHaveBeenCalledWith({
      main: [],
      repeaters: [
        {
          name: 'pizza',
          title: 'Pizza',
          value: [
            [
              {
                name: 'toppings',
                title: 'Toppings',
                value: 'Ham'
              },
              {
                name: 'quantity',
                title: 'Quantity',
                value: '2'
              }
            ],
            [
              {
                name: 'toppings',
                title: 'Toppings',
                value: 'Ham'
              },
              {
                name: 'quantity',
                title: 'Quantity',
                value: '2'
              }
            ]
          ]
        }
      ],
      retrievalKey: 'enrique.chase@defra.gov.uk',
      sessionId: expect.any(String)
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { PageRepeat } from '@defra/forms-model'
 * @import { OutgoingHttpHeaders } from 'node:http'
 */
