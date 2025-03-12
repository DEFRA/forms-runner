import { join } from 'node:path'

import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = '/templates'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Form template journey', () => {
  /** @type {Server} */
  let server

  /** @type {string} */
  let csrfToken

  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'templates.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      enforceCsrf: true
    })

    await server.initialize()

    // Navigate to start
    const response = await server.inject({
      url: `${basePath}/start`
    })

    // Extract the session cookie
    csrfToken = getCookie(response, 'crumb')
    headers = getCookieHeader(response, ['session', 'crumb'])
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /start', async () => {
    const { container, response } = await renderResponse(server, {
      url: `${basePath}/start`,
      headers
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $heading = container.getByRole('heading', {
      name: 'Start page',
      level: 1
    })

    expect($heading).toBeInTheDocument()
  })

  test('GET /full-name', async () => {
    const { container, response } = await renderResponse(server, {
      url: `${basePath}/full-name`,
      headers
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $heading = container.getByRole('heading', {
      name: "What's your name?",
      level: 1
    })

    expect($heading).toBeInTheDocument()
  })

  test('POST /full-name', async () => {
    const { response } = await renderResponse(server, {
      url: `${basePath}/full-name`,
      method: 'POST',
      headers,
      payload: { WmHfSb: 'Enrique Chase', crumb: csrfToken }
    })

    expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(response.headers.location).toBe(`${basePath}/are-you-in-england`)
  })

  test('GET /are-you-in-england', async () => {
    const { container, response } = await renderResponse(server, {
      url: `${basePath}/are-you-in-england`,
      headers
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $title = await container.findByText(
      'Are you in England, Enrique Chase? - Templates - GOV.UK'
    )

    expect($title).toBeInTheDocument()

    const $heading = container.getByRole('heading', {
      name: 'Are you in England, Enrique Chase?',
      level: 1
    })

    expect($heading).toBeInTheDocument()
  })

  test('POST /are-you-in-england with empty payload', async () => {
    const { response, container } = await renderResponse(server, {
      url: `${basePath}/are-you-in-england`,
      method: 'POST',
      headers,
      payload: { crumb: csrfToken }
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $errorSummary = container.getByRole('alert')

    const $heading = within($errorSummary).getByRole('heading', {
      name: 'There is a problem',
      level: 2
    })

    expect($heading).toBeInTheDocument()

    const $errorItems = within($errorSummary).getAllByRole('listitem')
    expect($errorItems[0]).toHaveTextContent(
      'Select are you in England, Enrique Chase?'
    )
  })

  test('POST /are-you-in-england', async () => {
    const { response } = await renderResponse(server, {
      url: `${basePath}/are-you-in-england`,
      method: 'POST',
      headers,
      payload: { TKsWbP: 'true', crumb: csrfToken }
    })

    expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(response.headers.location).toBe(`${basePath}/what-is-your-business`)
  })

  test('GET /what-is-your-business', async () => {
    const { container, response } = await renderResponse(server, {
      url: `${basePath}/what-is-your-business`,
      headers
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $title = await container.findByText(
      'What is your business, Enrique Chase? - Templates - GOV.UK'
    )

    expect($title).toBeInTheDocument()

    const $heading = container.getByRole('heading', {
      name: 'What is your business, Enrique Chase?',
      level: 1
    })

    expect($heading).toBeInTheDocument()
  })

  test('POST /what-is-your-business with empty payload', async () => {
    const { response, container } = await renderResponse(server, {
      url: `${basePath}/what-is-your-business`,
      method: 'POST',
      headers,
      payload: { crumb: csrfToken }
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $errorSummary = container.getByRole('alert')

    const $heading = within($errorSummary).getByRole('heading', {
      name: 'There is a problem',
      level: 2
    })

    expect($heading).toBeInTheDocument()

    const $errorItems = within($errorSummary).getAllByRole('listitem')
    expect($errorItems[0]).toHaveTextContent(
      'Select what is your business, Enrique Chase?'
    )
  })

  test('POST /what-is-your-business', async () => {
    const { response } = await renderResponse(server, {
      url: `${basePath}/what-is-your-business`,
      method: 'POST',
      headers,
      payload: { sdFYHf: 'grower', crumb: csrfToken }
    })

    expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(response.headers.location).toBe(`${basePath}/information`)
  })

  test('GET /information', async () => {
    const { container, response } = await renderResponse(server, {
      url: `${basePath}/information`,
      headers
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $title = await container.findByText(
      'Information: In England? true? - Templates - GOV.UK'
    )

    expect($title).toBeInTheDocument()

    const $heading = container.getByRole('heading', {
      name: 'Information: In England? true?',
      level: 1
    })

    expect($heading).toBeInTheDocument()

    const $output1 = container.getByTestId('output-1')
    expect($output1).toBeInTheDocument()
    expect($output1.textContent).toBe('Are you in England, Enrique Chase?')

    const $output2 = container.getByTestId('output-2')
    expect($output2).toBeInTheDocument()
    expect($output2.textContent).toBe(
      'A grower or producer of agricultural or horticultural produce'
    )

    const $output3 = container.getByTestId('output-3')
    expect($output3).toBeInTheDocument()
    expect($output3.textContent).toBe('Yes')

    const $output4 = container.getByTestId('output-4')
    expect($output4).toBeInTheDocument()
    expect($output4.textContent).toBe('/templates/are-you-in-england')
  })

  test('POST /information', async () => {
    const { response } = await renderResponse(server, {
      url: `${basePath}/information`,
      method: 'POST',
      headers,
      payload: { crumb: csrfToken }
    })

    expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(response.headers.location).toBe(`${basePath}/summary`)
  })

  test('GET /summary', async () => {
    const { container, response } = await renderResponse(server, {
      url: `${basePath}/summary`,
      headers
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $titles = container.queryAllByRole('term')
    expect($titles).toHaveLength(3)
    expect($titles[0]).toHaveTextContent("What's your full name?")
    expect($titles[1]).toHaveTextContent('Are you in England, Enrique Chase?')
    expect($titles[2]).toHaveTextContent(
      'What is your business, Enrique Chase?'
    )
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
