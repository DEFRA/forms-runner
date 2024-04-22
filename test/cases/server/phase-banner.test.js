import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import cheerio from 'cheerio'
import createServer from '../../../src/server/index.js'
import config from '../../../src/server/config.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe(`Phase banner`, () => {
  let server

  afterEach(async () => {
    await server.stop()
  })

  test('shows the beta tag by default', async () => {
    // For backwards-compatibility, as the main layout template currently always shows 'beta'.
    // TODO: default to no phase banner? TBD
    server = await createServer({
      formFileName: `phase-default.json`,
      formFilePath: join(testDir, '/forms')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: `${config.appPathPrefix}/phase-default/first-page`
    }

    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)

    const $ = cheerio.load(response.payload)

    expect($('.govuk-phase-banner__content__tag').text().trim()).toBe('beta')
  })

  test('shows the alpha tag if selected', async () => {
    server = await createServer({
      formFileName: `phase-alpha.json`,
      formFilePath: join(testDir, '/forms')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: `${config.appPathPrefix}/phase-alpha/first-page`
    }

    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)

    const $ = cheerio.load(response.payload)

    expect($('.govuk-phase-banner__content__tag').text().trim()).toBe('alpha')
  })

  test('does not show the phase banner if None', async () => {
    server = await createServer({
      formFileName: `phase-none.json`,
      formFilePath: join(testDir, '/forms')
    })
    await server.initialize()

    const options = {
      method: 'GET',
      url: `${config.appPathPrefix}/phase-none/first-page`
    }

    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)

    const $ = cheerio.load(response.payload)

    expect($('.govuk-phase-banner').html()).toBeNull()
  })
})
