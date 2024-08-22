import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { addDays, format } from 'date-fns'

import { createServer } from '~/src/server/index.js'
import {
  initiateUpload,
  getUploadStatus
} from '~/src/server/plugins/engine/services/uploadService.js'
import { FileStatus, UploadStatus } from '~/src/server/plugins/engine/types.js'
import { sendNotification } from '~/src/server/utils/notify.js'
import { getSessionCookie } from '~/test/utils/get-session-cookie.js'

const testDir = dirname(fileURLToPath(import.meta.url))

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/uploadService.js')

const okStatusCode = 200
const redirectStatusCode = 302
const htmlContentType = 'text/html'

const now = new Date()
const fileExpiryDate = addDays(now, 30)
const formattedExpiryDate = `${format(fileExpiryDate, 'h:mmaaa')} on ${format(fileExpiryDate, 'eeee d MMMM yyyy')}`

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


## Checkboxes field 1
Shetland


## Checkboxes field 2
Arabian,Shire,Race


## Checkboxes field 3 (number)
1


## Checkboxes field 4 (number)
0,1


## Upload your methodology statement
1 files uploaded (links expire ${formattedExpiryDate}):

* [test.pdf](https://test-designer.cdp-int.defra.cloud/file-download/5a76a1a3-bc8a-4bc0-859a-116d775c7f15)

`

const url = '/components/all-components'

/**
 * @satisfies {UploadInitiateResponse}
 */
const uploadInitiateResponse = {
  uploadId: '15b2303c-9965-4632-acb6-0776081e0399',
  uploadUrl:
    'http://localhost:7337/upload-and-scan/15b2303c-9965-4632-acb6-0776081e0399',
  statusUrl: 'http://localhost:7337/status/15b2303c-9965-4632-acb6-0776081e0399'
}

/**
 * @satisfies {UploadStatusResponse}
 */
const readyStatusResponse = {
  uploadStatus: UploadStatus.ready,
  metadata: {
    formId: '66c304662ad3b5fe57210e7c',
    path: '/file-upload-test/page-one',
    retrievalKey: 'enrique.chase@defra.gov.uk'
  },
  form: {
    file: {
      fileId: '5a76a1a3-bc8a-4bc0-859a-116d775c7f15',
      filename: 'test.pdf',
      contentLength: 1024,
      fileStatus: FileStatus.complete
    }
  },
  numberOfRejectedFiles: 0
}

describe('Submission journey test', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'components.json',
      formFilePath: join(testDir, 'definitions')
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /all-components returns 200', async () => {
    const res = await server.inject({
      method: 'GET',
      url
    })

    expect(res.statusCode).toEqual(okStatusCode)
    expect(res.headers['content-type']).toContain(htmlContentType)
  })

  test('POST /summary returns 302', async () => {
    const sender = jest.mocked(sendNotification)

    // GET the start page to create a session
    const initialiseRes = await server.inject({
      method: 'GET',
      url
    })

    // Extract the session cookie
    const cookie = getSessionCookie(initialiseRes)

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
      checkboxesSingle: 'Shetland',
      checkboxesMultiple: ['Arabian', 'Shire', 'Race'],
      checkboxesSingleNumber: 1,
      checkboxesMultipleNumber: [0, 1]
    }

    // POST the form data to set the state
    const res = await server.inject({
      method: 'POST',
      url,
      payload: form,
      headers: { cookie }
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/components/methodology-statement')

    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)
    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)

    // Adds a file
    await server.inject({
      method: 'GET',
      url: '/components/methodology-statement',
      headers: { cookie }
    })

    const fileUploadRes = await server.inject({
      method: 'POST',
      url: '/components/methodology-statement',
      headers: { cookie }
    })

    expect(fileUploadRes.statusCode).toEqual(redirectStatusCode)
    expect(fileUploadRes.headers.location).toBe('/components/summary')

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

/**
 * @import { Server } from '@hapi/hapi'
 */

/**
 * @typedef {import('~/src/server/plugins/engine/types.js').UploadInitiateResponse} UploadInitiateResponse
 * @typedef {import('~/src/server/plugins/engine/types.js').UploadStatusResponse} UploadStatusResponse
 */
