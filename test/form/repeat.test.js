import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { hasRepeater } from '@defra/forms-model'

import { createServer } from '~/src/server/index.js'
import { ADD_ANOTHER, CONTINUE } from '~/src/server/plugins/engine/helpers.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getSessionCookie } from '~/test/utils/get-session-cookie.js'

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
 * @param {string} [cookie]
 */
async function createRepeatItem(
  server,
  repeatPage,
  expectedItemCount = 1,
  cookie
) {
  const options = {
    method: 'POST',
    url,
    payload: {
      sQsXKK: 'Ham',
      VcmoiL: 2
    }
  }

  if (cookie) {
    Object.assign(options, { headers: { cookie } })
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
    cookie: getSessionCookie(res1)
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
      name: 'Pizza order'
    })

    const $heading2 = container.getByRole('heading', {
      name: 'Pizza 1'
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
    const { item, cookie } = await createRepeatItem(server, repeatPage)
    const res = await server.inject({
      method: 'GET',
      url: `${url}/${item.itemId}`,
      headers: { cookie }
    })

    expect(res.statusCode).toBe(okStatusCode)
  })

  test('GET /repeat/pizza-order/{id}/confirm-delete returns 200', async () => {
    const { item, cookie } = await createRepeatItem(server, repeatPage)
    const res = await server.inject({
      method: 'GET',
      url: `${url}/${item.itemId}/confirm-delete`,
      headers: { cookie }
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
    const { cookie } = await createRepeatItem(server, repeatPage)
    await createRepeatItem(server, repeatPage, 2, cookie)

    const options = {
      method: 'GET',
      url: `${url}/summary`,
      headers: { cookie }
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

  afterAll(async () => {
    await server.stop()
  })

  test('POST /repeat/pizza-order/{id} returns 302', async () => {
    const { item, cookie } = await createRepeatItem(server, repeatPage)
    const res = await server.inject({
      method: 'POST',
      url: `${url}/${item.itemId}`,
      headers: { cookie },
      payload: {
        sQsXKK: 'Ham',
        VcmoiL: 3
      }
    })

    expect(res.statusCode).toBe(redirectStatusCode)
    expect(res.headers.location).toBe('/repeat/pizza-order/summary')
  })

  test('POST /repeat/pizza-order/{id}/confirm-delete returns 302', async () => {
    const { item, cookie } = await createRepeatItem(server, repeatPage)
    const res = await server.inject({
      method: 'POST',
      url: `${url}/${item.itemId}/confirm-delete`,
      headers: { cookie },
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
    const { cookie } = await createRepeatItem(server, repeatPage)

    const res = await server.inject({
      method: 'POST',
      url: `${url}/summary`,
      headers: { cookie },
      payload: {
        action: CONTINUE
      }
    })

    expect(res.statusCode).toBe(redirectStatusCode)
    expect(res.headers.location).toBe('/repeat/summary')
  })

  test('POST /repeat/pizza-order/summary ADD_ANOTHER returns 200 with errors over schema.max', async () => {
    const { cookie } = await createRepeatItem(server, repeatPage)
    await createRepeatItem(server, repeatPage, 2, cookie)

    const { container, response } = await renderResponse(server, {
      method: 'POST',
      url: `${url}/summary`,
      headers: { cookie },
      payload: {
        action: ADD_ANOTHER
      }
    })

    expect(response.statusCode).toBe(okStatusCode)

    const $alerts = container.getAllByRole('alert')

    expect($alerts[0]).toHaveTextContent('There is a problem')
    expect($alerts[0]).toHaveTextContent('You can only add up to 2 Pizzas')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { PageRepeat } from '@defra/forms-model'
 */
