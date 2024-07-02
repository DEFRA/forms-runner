import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import createServer from '~/src/server/index.js'
import { sendNotification } from '~/src/server/utils/notify.js'
import { getSessionCookie } from '~/test/cases/server/utils/get-session-cookie.js'

const testDir = dirname(fileURLToPath(import.meta.url))

jest.mock('~/src/server/utils/notify.ts')

const okStatusCode = 200
const redirectStatusCode = 302
const htmlContentType = 'text/html'
const formResults = `## Text field
Text field


## Multiline text field
Multiline text field


## Number field
1


## Date parts field
2012-12-12


## Yes/No field
yes


## Email address field
user@email.com


## Telephone number field
+447900000000


## Telephone number field
Address line 1, Address line 2, Town or city, CW1 1AB


## Radios field
privateLimitedCompany


## Select field
910400000


## Checkboxes field
Arabian,Shire,Race`

describe('Submission journey test', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'components.json',
      formFilePath: testDir
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /all-components returns 200', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/components/all-components'
    })

    expect(res.statusCode).toEqual(okStatusCode)
    expect(res.headers['content-type']).toContain(htmlContentType)
  })

  test('POST /summary returns 302', async () => {
    const sender = jest.mocked(sendNotification)

    const form = {
      textField: 'Text field',
      multilineTextField: 'Multiline text field',
      numberField: '1',
      datePartsField__day: '12',
      datePartsField__month: '12',
      datePartsField__year: '2012',
      yesNoField: 'true',
      emailAddressField: 'user@email.com',
      telephoneNumberField: '+447900000000',
      addressField__addressLine1: 'Address line 1',
      addressField__addressLine2: 'Address line 2',
      addressField__town: 'Town or city',
      addressField__postcode: 'CW1 1AB',
      radiosField: 'privateLimitedCompany',
      selectField: '910400000',
      checkboxesField: ['Arabian', 'Shire', 'Race']
    }

    // POST the form data to set the state
    const res = await server.inject({
      method: 'POST',
      url: '/components/all-components',
      payload: form
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/components/summary')

    // Extract the session cookie
    const cookie = getSessionCookie(res)

    // GET the summary page
    await server.inject({
      method: 'GET',
      url: '/components/summary',
      headers: { cookie }
    })

    // POST the summary form and assert
    // the mock sendNotification contains
    // the correct personalisation data
    const submitRes = await server.inject({
      method: 'POST',
      url: '/components/summary',
      headers: { cookie },
      payload: {}
    })

    expect(sender).toHaveBeenCalledWith({
      templateId: process.env.NOTIFY_TEMPLATE_ID,
      emailAddress: 'enrique.chase@defra.gov.uk',
      personalisation: {
        formName: 'All components',
        formResults: expect.stringContaining(formResults)
      }
    })
    expect(submitRes.statusCode).toBe(redirectStatusCode)
    expect(submitRes.headers.location).toBe('/components/status')

    // Finally GET the /{slug}/status page
    const statusRes = await server.inject({
      method: 'GET',
      url: '/components/status',
      headers: { cookie }
    })

    expect(statusRes.statusCode).toBe(okStatusCode)
    expect(statusRes.headers['content-type']).toContain(htmlContentType)
  })
})
