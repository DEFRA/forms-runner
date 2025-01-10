import crypto from 'node:crypto'
import { resolve } from 'node:path'

import { hasRepeater } from '@defra/forms-model'
import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { createServer } from '~/src/server/index.js'
import { isRepeatState } from '~/src/server/plugins/engine/components/FormComponent.js'
import { submit } from '~/src/server/plugins/engine/services/formSubmissionService.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import { FormAction } from '~/src/server/routes/types.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')

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
  itemId = crypto.randomUUID()
) {
  // Visit the item page
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

  // Extract the session cookie
  const request = res1.request
  const { cacheService } = request.services([])

  const { name } = repeatPage.repeat.options
  const state = await cacheService.getState(request)

  if (!isRepeatState(state[name]) || state[name].length !== expectedItemCount) {
    throw new Error('Unexpected list state')
  }

  const item = state[name].at(-1)

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
      formFilePath: resolve(import.meta.dirname, '../form/definitions')
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

  test('GET /pizza-order returns 302 to add another', async () => {
    const res = await server.inject({
      url: `${basePath}/pizza-order`
    })

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(res.headers.location).toMatch(/^\/repeat\/pizza-order\/[0-9a-f-]+$/)
  })

  test('GET /pizza-order with 1 item returns 302 to repeater summary', async () => {
    const { headers } = await createRepeatItem(server, repeatPage, 1)

    const res = await server.inject({
      url: `${basePath}/pizza-order`,
      headers
    })

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(res.headers.location).toMatch(`${basePath}/pizza-order/summary`)
  })

  test('GET /pizza-order with 2 items returns 302 to repeater summary', async () => {
    const { headers } = await createRepeatItem(server, repeatPage, 1)

    await createRepeatItem(server, repeatPage, 2, headers)

    const res = await server.inject({
      url: `${basePath}/pizza-order`,
      headers
    })

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(res.headers.location).toMatch(`${basePath}/pizza-order/summary`)
  })

  test('GET /pizza-order with 3 items returns 302 to repeater summary', async () => {
    const { headers } = await createRepeatItem(server, repeatPage, 1)

    await createRepeatItem(server, repeatPage, 2, headers)
    await createRepeatItem(server, repeatPage, 3, headers)

    const res = await server.inject({
      url: `${basePath}/pizza-order`,
      headers
    })

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(res.headers.location).toBe(`${basePath}/pizza-order/summary`)
  })

  test('GET /pizza-order/summary returns 302 to add another', async () => {
    const res = await server.inject({
      url: `${basePath}/pizza-order/summary`
    })

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(res.headers.location).toMatch(/^\/repeat\/pizza-order\/[0-9a-f-]+$/)
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

    // Visit the summary page
    await server.inject({
      url: redirectLocation,
      headers
    })

    const { container, response } = await renderResponse(server, {
      url: `${basePath}/pizza-order/${item.itemId}?returnUrl=${encodeURIComponent(`${basePath}/pizza-order/summary`)}`,
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
      name: 'Go back to add another'
    })

    expect($backLink).toBeInTheDocument()
    expect($backLink).toHaveAttribute('href', `${basePath}/pizza-order/summary`)
  })

  test('GET /pizza-order/{id} with 1 item returns 200', async () => {
    const { headers } = await createRepeatItem(server, repeatPage, 1)

    const itemId = '00000000-0000-0000-0000-000000000000'
    jest.spyOn(crypto, 'randomUUID').mockReturnValue(itemId)

    const res = await server.inject({
      url: `${basePath}/pizza-order/${itemId}`,
      headers
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  test('GET /pizza-order/{id} with 2 items returns 200', async () => {
    const { headers } = await createRepeatItem(server, repeatPage, 1)
    await createRepeatItem(server, repeatPage, 2, headers)

    const itemId = '00000000-0000-0000-0000-000000000000'
    jest.spyOn(crypto, 'randomUUID').mockReturnValue(itemId)

    const res = await server.inject({
      url: `${basePath}/pizza-order/${itemId}`,
      headers
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  test('GET /pizza-order/{id} with 3 items returns 200', async () => {
    const { headers } = await createRepeatItem(server, repeatPage, 1)

    await createRepeatItem(server, repeatPage, 2, headers)
    await createRepeatItem(server, repeatPage, 3, headers)

    const itemId = '00000000-0000-0000-0000-000000000000'
    jest.spyOn(crypto, 'randomUUID').mockReturnValue(itemId)

    const res = await server.inject({
      url: `${basePath}/pizza-order/${itemId}`,
      headers
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  test('GET /pizza-order/{id}/confirm-delete with 1 item returns 404', async () => {
    const { item, headers } = await createRepeatItem(server, repeatPage)

    const res = await server.inject({
      url: `${basePath}/pizza-order/${item.itemId}/confirm-delete`,
      headers
    })

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
  })

  test('GET /pizza-order/{id}/confirm-delete with 2 items returns 200', async () => {
    const { item, headers } = await createRepeatItem(server, repeatPage)
    await createRepeatItem(server, repeatPage, 2, headers)

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

  test('GET /pizza-order/summary with 1 item returns 200', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)

    const res = await server.inject({
      url: `${basePath}/pizza-order/summary`,
      headers
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  test('GET /pizza-order/summary with 2 items returns 200', async () => {
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
      formFilePath: resolve(import.meta.dirname, '../form/definitions')
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

  test('POST /pizza-order/{id}/confirm-delete with 1 item returns 404', async () => {
    const { item, headers } = await createRepeatItem(server, repeatPage)

    const res = await server.inject({
      url: `${basePath}/pizza-order/${item.itemId}/confirm-delete`,
      method: 'POST',
      headers,
      payload: {
        confirm: true
      }
    })

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
  })

  test('POST /pizza-order/{id}/confirm-delete with 2 items returns 303', async () => {
    const { item, headers } = await createRepeatItem(server, repeatPage)
    await createRepeatItem(server, repeatPage, 2, headers)

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
    const itemId = '00000000-0000-0000-0000-000000000000'
    jest.spyOn(crypto, 'randomUUID').mockReturnValue(itemId)

    const res = await server.inject({
      url: `${basePath}/pizza-order/summary`,
      method: 'POST',
      payload: {
        action: FormAction.AddAnother
      }
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/pizza-order/${itemId}`)
  })

  test('POST /pizza-order/summary with 1 item ADD_ANOTHER returns 303', async () => {
    const itemId = '00000000-0000-0000-0000-000000000000'
    jest.spyOn(crypto, 'randomUUID').mockReturnValue(itemId)

    const { headers } = await createRepeatItem(server, repeatPage)

    const res = await server.inject({
      url: `${basePath}/pizza-order/summary`,
      method: 'POST',
      headers,
      payload: {
        action: FormAction.AddAnother
      }
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/pizza-order/${itemId}`)
  })

  test('POST /pizza-order/summary with 2 items ADD_ANOTHER returns 303', async () => {
    const itemId = '00000000-0000-0000-0000-000000000000'
    jest.spyOn(crypto, 'randomUUID').mockReturnValue(itemId)

    const { headers } = await createRepeatItem(server, repeatPage)

    await createRepeatItem(server, repeatPage, 1, headers)

    const res = await server.inject({
      url: `${basePath}/pizza-order/summary`,
      method: 'POST',
      headers,
      payload: {
        action: FormAction.AddAnother
      }
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/pizza-order/${itemId}`)
  })

  test('POST /pizza-order/summary with 3 items ADD_ANOTHER returns 200 with errors over schema.max', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)

    await createRepeatItem(server, repeatPage, 2, headers)
    await createRepeatItem(server, repeatPage, 3, headers)

    const { container, response } = await renderResponse(server, {
      url: `${basePath}/pizza-order/summary`,
      method: 'POST',
      headers,
      payload: {
        action: FormAction.AddAnother
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
    expect($errorItems[0]).toHaveTextContent('You can only add up to 3 Pizzas')
  })

  test('POST /pizza-order/summary CONTINUE with 1 item returns 200 with errors under schema.min', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)

    const { container, response } = await renderResponse(server, {
      url: `${basePath}/pizza-order/summary`,
      method: 'POST',
      headers,
      payload: {
        action: FormAction.Continue
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
    expect($errorItems[0]).toHaveTextContent('You must add at least 2 Pizzas')
  })

  test('POST /pizza-order/summary with 2 items CONTINUE returns 303 to /summary', async () => {
    const { headers } = await createRepeatItem(server, repeatPage)

    await createRepeatItem(server, repeatPage, 2, headers)

    const res1 = await server.inject({
      url: `${basePath}/pizza-order/summary`,
      method: 'POST',
      headers,
      payload: {
        action: FormAction.Continue
      }
    })

    expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res1.headers.location).toBe(`${basePath}/summary`)

    const { container, response: res2 } = await renderResponse(server, {
      url: `${basePath}/summary`,
      headers
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
      url: `${basePath}/summary`,
      method: 'POST',
      headers,
      payload: {
        action: FormAction.Send
      }
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
