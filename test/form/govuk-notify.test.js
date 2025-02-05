import { join } from 'node:path'

import { StatusCodes } from 'http-status-codes'
import { outdent } from 'outdent'

import { createServer } from '~/src/server/index.js'
import {
  persistFiles,
  submit
} from '~/src/server/plugins/engine/services/formSubmissionService.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import {
  getUploadStatus,
  initiateUpload
} from '~/src/server/plugins/engine/services/uploadService.js'
import { FileStatus, UploadStatus } from '~/src/server/plugins/engine/types.js'
import { FormAction } from '~/src/server/routes/types.js'
import { sendNotification } from '~/src/server/utils/notify.js'
import * as fixtures from '~/test/fixtures/index.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = '/components'

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/uploadService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')
jest.mock('~/src/server/plugins/engine/services/formsService.js')

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

const submitResponse = {
  message: 'Submit completed',
  result: {
    files: {
      main: '00000000-0000-0000-0000-000000000000',
      repeaters: {}
    }
  }
}

describe('Submission journey test', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'components.json',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /all-components returns 200', async () => {
    const res = await server.inject({
      url: `${basePath}/all-components`
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res.headers['content-type']).toContain('text/html')
  })

  test('POST /summary returns 303', async () => {
    const sender = jest.mocked(sendNotification)
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)
    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
    jest.mocked(submit).mockResolvedValue(submitResponse)

    // Components page
    const res = await componentsPage()

    // Extract the session cookie
    const headers = getCookieHeader(res, 'session')

    // File upload page
    await fileUploadPage(headers)

    // Summary page
    await summaryPage(headers)

    expect(persistFiles).toHaveBeenCalledTimes(1)
    expect(sender).toHaveBeenCalledWith({
      templateId: process.env.NOTIFY_TEMPLATE_ID,
      emailAddress: 'enrique.chase@defra.gov.uk',
      personalisation: {
        subject: 'Form submission: All components',
        body: expect.stringContaining(outdent`
          ---

          ## Text field

          Text field

          ---

          ## Multiline text field

          Multiline text field

          ---

          ## Number field

          1

          ---

          ## Date parts field

          12 December 2012

          ---

          ## Month year field

          December 2012

          ---

          ## Yes/No field

          Yes \\(true\\)

          ---

          ## Email address field

          user@email\\.com

          ---

          ## Telephone number field

          \\+447900000000

          ---

          ## Address field

          Address line 1
          Address line 2
          Town or city
          CW1 1AB

          ---

          ## Radios field

          Private Limited Company \\(privateLimitedCompany\\)

          ---

          ## Select field

          Afghanistan \\(910400000\\)

          ---

          ## Autocomplete field

          Czech Republic \\(910400044\\)

          ---

          ## Checkboxes field 1

          * Shetland

          ---

          ## Checkboxes field 2

          * Arabian
          * Shire
          * Race

          ---

          ## Checkboxes field 3 \\(number\\)

          * 1 point \\(1\\)

          ---

          ## Checkboxes field 4 \\(number\\)

          * None \\(0\\)
          * 1 point \\(1\\)

          ---

          ## Upload your methodology statement

          Uploaded 1 file:

          * [test\\.pdf](https://forms-designer/file-download/5a76a1a3-bc8a-4bc0-859a-116d775c7f15)

          ---

          [Download main form \\(CSV\\)](https://forms-designer/file-download/00000000-0000-0000-0000-000000000000)`)
      }
    })

    expect(submit).toHaveBeenCalledWith({
      main: [
        {
          name: 'textField',
          title: 'Text field',
          value: 'Text field'
        },
        {
          name: 'multilineTextField',
          title: 'Multiline text field',
          value: 'Multiline text field'
        },
        {
          name: 'numberField',
          title: 'Number field',
          value: '1'
        },
        {
          name: 'datePartsField',
          title: 'Date parts field',
          value: '2012-12-12'
        },
        {
          name: 'monthYearField',
          title: 'Month year field',
          value: '2012-12'
        },
        {
          name: 'yesNoField',
          title: 'Yes/No field',
          value: 'true'
        },
        {
          name: 'emailAddressField',
          title: 'Email address field',
          value: 'user@email.com'
        },
        {
          name: 'telephoneNumberField',
          title: 'Telephone number field',
          value: '+447900000000'
        },
        {
          name: 'addressField',
          title: 'Address field',
          value: 'Address line 1,Address line 2,Town or city,CW1 1AB'
        },
        {
          name: 'radiosField',
          title: 'Radios field',
          value: 'privateLimitedCompany'
        },
        {
          name: 'selectField',
          title: 'Select field',
          value: '910400000'
        },
        {
          name: 'autocompleteField',
          title: 'Autocomplete field',
          value: '910400044'
        },
        {
          name: 'checkboxesSingle',
          title: 'Checkboxes field 1',
          value: 'Shetland'
        },
        {
          name: 'checkboxesMultiple',
          title: 'Checkboxes field 2',
          value: 'Arabian,Shire,Race'
        },
        {
          name: 'checkboxesSingleNumber',
          title: 'Checkboxes field 3 (number)',
          value: '1'
        },
        {
          name: 'checkboxesMultipleNumber',
          title: 'Checkboxes field 4 (number)',
          value: '0,1'
        },
        {
          name: 'fileUpload',
          title: 'Upload your methodology statement',
          value: '5a76a1a3-bc8a-4bc0-859a-116d775c7f15'
        }
      ],
      repeaters: [],
      retrievalKey: 'enrique.chase@defra.gov.uk',
      sessionId: expect.any(String)
    })

    // Status page
    await statusPage(headers)
  })

  /**
   * POSTs data to the components page
   */
  async function componentsPage() {
    const form = {
      textField: 'Text field',
      multilineTextField: 'Multiline text field',
      numberField: '1',
      datePartsField__day: '12',
      datePartsField__month: '12',
      datePartsField__year: '2012',
      monthYearField__month: '12',
      monthYearField__year: '2012',
      yesNoField: 'true',
      emailAddressField: 'user@email.com',
      telephoneNumberField: '+447900000000',
      addressField__addressLine1: 'Address line 1',
      addressField__addressLine2: 'Address line 2',
      addressField__town: 'Town or city',
      addressField__postcode: 'CW1 1AB',
      radiosField: 'privateLimitedCompany',
      selectField: '910400000',
      autocompleteField: '910400044',
      checkboxesSingle: 'Shetland',
      checkboxesMultiple: ['Arabian', 'Shire', 'Race'],
      checkboxesSingleNumber: 1,
      checkboxesMultipleNumber: [0, 1]
    }

    // POST the form data to set the state
    const res = await server.inject({
      url: `${basePath}/all-components`,
      method: 'POST',
      payload: form
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/methodology-statement`)

    return res
  }

  /**
   * Adds a file to the temp state as
   * would happen on redirect from CDP
   * @param {OutgoingHttpHeaders} headers
   */
  async function fileUploadPage(headers) {
    await server.inject({
      url: `${basePath}/methodology-statement`,
      headers
    })

    const res = await server.inject({
      url: `${basePath}/methodology-statement`,
      method: 'POST',
      headers,
      payload: {}
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/summary`)

    return res
  }

  /**
   * GETs and POSTs the summary page
   * @param {OutgoingHttpHeaders} headers
   */
  async function summaryPage(headers) {
    await server.inject({
      url: `${basePath}/summary`,
      headers
    })

    const res = await server.inject({
      url: `${basePath}/summary`,
      method: 'POST',
      headers,
      payload: {
        action: FormAction.Send
      }
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/status`)

    return res
  }

  /**
   * GETs the summary page
   * @param {OutgoingHttpHeaders} headers
   */
  async function statusPage(headers) {
    // Finally GET the /{slug}/status page
    const statusRes = await server.inject({
      url: `${basePath}/status`,
      headers
    })

    expect(statusRes.statusCode).toBe(StatusCodes.OK)
    expect(statusRes.headers['content-type']).toContain('text/html')
  }
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { OutgoingHttpHeaders } from 'node:http'
 * @import { UploadInitiateResponse, UploadStatusResponse } from '~/src/server/plugins/engine/types.js'
 */
