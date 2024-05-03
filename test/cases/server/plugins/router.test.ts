import { type Server } from '@hapi/hapi'

import createServer from '~/src/server/index.js'

describe('Server Router', () => {
  let server: Server

  beforeAll(async () => {
    server = await createServer({})
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('cookies page is served', async () => {
    const options = {
      method: 'GET',
      url: '/help/cookies'
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(200)
    expect(res.result).toContain(
      `<h1 class="govuk-heading-l">Cookies on Defra forms</h1>`
    )
  })

  test('cookies preferences are set', async () => {
    const options = {
      method: 'POST',
      payload: {
        cookies: 'accept'
      },
      url: '/help/cookies'
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(302)
  })

  test('accessibility statement page is served', async () => {
    const options = {
      method: 'GET',
      url: '/help/accessibility-statement'
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(200)
    expect(res.result).toContain(
      '<h1 class="govuk-heading-l">Accessibility Statement</h1>'
    )
  })

  test('terms and conditions page is served', async () => {
    const options = {
      method: 'GET',
      url: '/help/terms-and-conditions'
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(200)
    expect(res.result).toContain(
      '<h1 class="govuk-heading-l">Terms and conditions</h1>'
    )
  })
})
