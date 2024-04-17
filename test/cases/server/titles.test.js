import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import cheerio from 'cheerio'
import createServer from '../../../src/server/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe('Title and section title', () => {
  let server

  beforeAll(async () => {
    server = await createServer({
      formFileName: `titles.json`,
      formFilePath: testDir,
      options: { previewMode: true }
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  it('does not render the section title if it is the same as the title', async () => {
    const options = {
      method: 'GET',
      url: `/forms-runner/titles/applicant-one?visit=1`
    }

    const response = await server.inject(options)
    const $ = cheerio.load(response.payload)

    expect($('#section-title').html()).toBeNull()
    expect($('h1').text().trim()).toMatch(/^Applicant 1/)
  })
  it('does render the section title if it is not the same as the title', async () => {
    const options = {
      method: 'GET',
      url: `/forms-runner/titles/applicant-one-address?visit=1`
    }

    const response = await server.inject(options)
    const $ = cheerio.load(response.payload)

    expect($('#section-title').text().trim()).toBe('Applicant 1')
    expect($('h1.govuk-fieldset__heading').text().trim()).toBe('Address')
  })
  it('renders the section title as H2, outside of the H1', async () => {
    const options = {
      method: 'GET',
      url: `/forms-runner/titles/applicant-one-address?visit=1`
    }

    const response = await server.inject(options)
    const $ = cheerio.load(response.payload)

    expect($('h1 #section-title').html()).toBeNull()
    expect($('h2#section-title')).toBeTruthy()
  })

  it('Does not render the section title if hideTitle is set to true', async () => {
    const options = {
      method: 'GET',
      url: `/forms-runner/titles/applicant-two?visit=1`
    }

    const response = await server.inject(options)
    const $ = cheerio.load(response.payload)

    expect($('h1').text().trim()).toMatch(/^Applicant 2 details/)
    expect($('h2#section-title').html()).toBeNull()
  })
})
