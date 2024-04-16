import createServer from '../../../../src/server'

describe('Server Router', () => {
  let server

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
      url: `/forms-runner/help/cookies`
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(200)
    expect(
      res.result.indexOf(
        `<h1 class="govuk-heading-l">Cookies on Defra forms</h1>`
      ) > -1
    ).toBe(true)
  })

  test('cookies preferences are set', async () => {
    const options = {
      method: 'POST',
      payload: {
        cookies: 'accept'
      },
      url: '/forms-runner/help/cookies'
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(302)
  })

  test('accessibility statement page is served', async () => {
    const options = {
      method: 'GET',
      url: `/forms-runner/help/accessibility-statement`
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(200)
    expect(
      res.result.indexOf(
        '<h1 class="govuk-heading-l">Accessibility Statement</h1>'
      ) > -1
    ).toBe(true)
  })

  test('terms and conditions page is served', async () => {
    const options = {
      method: 'GET',
      url: `/forms-runner/help/terms-and-conditions`
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(200)
    expect(
      res.result.indexOf(
        '<h1 class="govuk-heading-l">Terms and conditions</h1>'
      ) > -1
    ).toBe(true)
  })
})
