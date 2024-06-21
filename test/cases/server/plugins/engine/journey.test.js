import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import FormData from 'form-data'
import { NotifyClient } from 'notifications-node-client'

import { getSessionCookie } from '../../utils/get-session-cookie.js'

import createServer from '~/src/server/index.js'

jest.mock('notifications-node-client')

const testDir = dirname(fileURLToPath(import.meta.url))
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


## Time field
12:12


## Date time parts field
12 December 2012 12:12


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
    const mockClient = jest.mocked(NotifyClient)

    const form = new FormData()
    form.append('textField', 'Text field')
    form.append('multilineTextField', 'Multiline text field')
    form.append('numberField', '1')
    form.append('datePartsField__day', '12')
    form.append('datePartsField__month', '12')
    form.append('datePartsField__year', '2012')
    form.append('timeField', '12:12')
    form.append('dateTimePartsField__day', '12')
    form.append('dateTimePartsField__month', '12')
    form.append('dateTimePartsField__year', '2012')
    form.append('dateTimePartsField__hour', '12')
    form.append('dateTimePartsField__minute', '12')
    form.append('yesNoField', 'true')
    form.append('emailAddressField', 'user@email.com')
    form.append('telephoneNumberField', '+447900000000')
    form.append('addressField__addressLine1', 'Address line 1')
    form.append('addressField__addressLine2', 'Address line 2')
    form.append('addressField__town', 'Town or city')
    form.append('addressField__postcode', 'CW1 1AB')
    form.append('radiosField', 'privateLimitedCompany')
    form.append('selectField', '910400000')
    form.append('checkboxesField', 'Arabian')
    form.append('checkboxesField', 'Shire')
    form.append('checkboxesField', 'Race')

    // POST the form data to set the state
    const res = await server.inject({
      method: 'POST',
      url: '/components/all-components',
      headers: form.getHeaders(),
      payload: form.getBuffer()
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
    const summaryForm = new FormData()
    const submitRes = await server.inject({
      method: 'POST',
      url: '/components/summary',
      headers: { ...summaryForm.getHeaders(), cookie },
      payload: summaryForm.getBuffer()
    })

    const context = mockClient.mock.contexts[0]
    const sendOpts = context.sendEmail.mock.calls[0][2]
    expect(sendOpts.personalisation.formResults).toContain(formResults)
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
