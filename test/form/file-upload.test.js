import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { within } from '@testing-library/dom'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import {
  getUploadStatus,
  initiateUpload
} from '~/src/server/plugins/engine/services/uploadService.js'
import { FileStatus, UploadStatus } from '~/src/server/plugins/engine/types.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const testDir = dirname(fileURLToPath(import.meta.url))

jest.mock('~/src/server/plugins/engine/services/uploadService.js')
jest.mock('~/src/server/plugins/engine/services/formsService.js')

const okStatusCode = 200
const redirectStatusCode = 302
const badRequestStatusCode = 400

const url = '/file-upload/methodology-statement'
const metadata = {
  formId: '66c304662ad3b5fe57210e7c',
  path: url,
  retrievalKey: 'enrique.chase@defra.gov.uk'
}

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
const initiatedStatusResponse = {
  uploadStatus: UploadStatus.initiated,
  metadata,
  form: {}
}

/**
 * @satisfies {UploadStatusResponse}
 */
const pendingStatusResponse = {
  uploadStatus: UploadStatus.pending,
  metadata,
  form: {
    file: {
      fileId: '5a76a1a3-bc8a-4bc0-859a-116d775c7f15',
      filename: 'test.pdf',
      contentLength: 1024,
      fileStatus: FileStatus.pending
    }
  }
}

/**
 * @satisfies {UploadStatusResponse}
 */
const readyStatusResponse = {
  uploadStatus: UploadStatus.ready,
  metadata,
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

describe('File upload GET tests', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'file-upload.json',
      formFilePath: resolve(testDir, '../form/definitions')
    })
    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /file-upload returns 200', async () => {
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const options = {
      method: 'GET',
      url
    }

    const { container, response } = await renderResponse(server, options)
    expect(response.statusCode).toBe(okStatusCode)

    const $heading1 = container.getByRole('heading', {
      name: 'Upload your methodology statement',
      level: 1
    })

    const $heading2 = container.getByRole('heading', {
      name: 'Uploaded files',
      level: 2
    })

    expect($heading1).toBeInTheDocument()
    expect($heading1).toHaveClass('govuk-heading-l')

    expect($heading2).toBeInTheDocument()
    expect($heading2).toHaveClass('govuk-heading-m')
  })

  test('GET /file-upload returns uses cached initiated upload', async () => {
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const options = {
      method: 'GET',
      url
    }

    const res1 = await server.inject(options)
    expect(res1.statusCode).toBe(okStatusCode)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    jest.mocked(getUploadStatus).mockResolvedValueOnce(initiatedStatusResponse)

    const res2 = await server.inject({ ...options, headers })
    expect(res2.statusCode).toBe(okStatusCode)

    // Assert invalid status response from CDP throws
    jest.mocked(getUploadStatus).mockResolvedValueOnce(undefined)

    const res3 = await server.inject({ ...options, headers })
    expect(res3.statusCode).toBe(badRequestStatusCode)
  })

  test('GET /file-upload returns handles consumed upload', async () => {
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const options = {
      method: 'GET',
      url
    }

    const res1 = await server.inject(options)
    expect(res1.statusCode).toBe(okStatusCode)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    jest.mocked(getUploadStatus).mockResolvedValue(pendingStatusResponse)
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const res2 = await server.inject({ ...options, headers })
    expect(res2.statusCode).toBe(okStatusCode)
  })
})

describe('File upload POST tests', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'file-upload.json',
      formFilePath: resolve(testDir, '../form/definitions')
    })
    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('POST /file-upload with pending file returns 200 with errors', async () => {
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)

    const options = {
      method: 'GET',
      url
    }

    const res1 = await server.inject(options)
    expect(res1.statusCode).toBe(okStatusCode)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    jest.mocked(getUploadStatus).mockResolvedValue(pendingStatusResponse)

    const { container, response } = await renderResponse(server, {
      method: 'POST',
      url,
      headers
    })

    expect(response.statusCode).toBe(okStatusCode)

    const $lists = container.getAllByRole('list')
    const $links = within($lists[0]).getAllByRole('link')

    expect($links[0]).toHaveTextContent(
      'The selected file has not fully uploaded'
    )

    expect($links[1]).toHaveTextContent(
      'Upload your methodology statement must contain at least 2 items'
    )

    const $input = container.getByLabelText(
      'Upload your methodology statement (optional)'
    )

    expect($input).toHaveAccessibleDescription(
      expect.stringContaining(
        'Error: Upload your methodology statement must contain at least 2 items'
      )
    )
  })

  test('POST /file-upload with 2 valid files returns 302 to /summary', async () => {
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)
    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)

    const options = {
      method: 'GET',
      url
    }

    const res1 = await server.inject(options)
    expect(res1.statusCode).toBe(okStatusCode)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    const res2 = await server.inject({
      method: 'GET',
      url,
      headers
    })

    expect(res2.statusCode).toBe(okStatusCode)

    const res3 = await server.inject({
      method: 'POST',
      url,
      headers
    })

    expect(res3.statusCode).toBe(redirectStatusCode)
    expect(res3.headers.location).toBe('/file-upload/summary')
  })

  test('POST /file-upload with remove deletes the file', async () => {
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)
    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)

    const options = {
      method: 'GET',
      url
    }

    const res1 = await server.inject(options)
    expect(res1.statusCode).toBe(okStatusCode)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    const res2 = await server.inject({
      method: 'GET',
      url,
      headers
    })

    expect(res2.statusCode).toBe(okStatusCode)

    const res3 = await server.inject({
      method: 'POST',
      url,
      headers,
      payload: {
        __remove: '15b2303c-9965-4632-acb6-0776081e0399'
      }
    })

    expect(res3.statusCode).toBe(redirectStatusCode)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { UploadInitiateResponse, UploadStatusResponse } from '~/src/server/plugins/engine/types.js'
 */
