import { load } from 'cheerio'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'
import {
  initiateUpload,
  getUploadStatus
} from '~/src/server/plugins/engine/services/uploadService.js'
import { FileStatus, UploadStatus } from '~/src/server/plugins/engine/types.js'
import { getSessionCookie } from '~/test/utils/get-session-cookie.js'

const testDir = dirname(fileURLToPath(import.meta.url))

jest.mock('~/src/server/plugins/engine/services/uploadService.js')

const okStatusCode = 200
const redirectStatusCode = 302
const badRequestStatusCode = 400

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
  metadata: {
    formId: '66c304662ad3b5fe57210e7c',
    path: '/file-upload-test/page-one',
    retrievalKey: 'enrique.chase@defra.gov.uk'
  },
  form: {}
}

/**
 * @satisfies {UploadStatusResponse}
 */
const pendingStatusResponse = {
  uploadStatus: UploadStatus.pending,
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
      fileStatus: FileStatus.pending
    }
  }
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

describe('File upload tests', () => {
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

  afterAll(async () => {
    await server.stop()
  })

  test('GET /file-upload returns 200', async () => {
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const options = {
      method: 'GET',
      url: '/file-upload/methodology-statement'
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(okStatusCode)
  })

  test('GET /file-upload returns uses cached initiated upload', async () => {
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const options = {
      method: 'GET',
      url: '/file-upload/methodology-statement'
    }

    const res1 = await server.inject(options)

    expect(res1.statusCode).toBe(okStatusCode)

    // Extract the session cookie
    const cookie = getSessionCookie(res1)

    jest.mocked(getUploadStatus).mockResolvedValueOnce(initiatedStatusResponse)

    const res2 = await server.inject({
      ...options,
      headers: { cookie }
    })

    expect(res2.statusCode).toBe(okStatusCode)

    // Assert invalid status response from CDP throws
    jest.mocked(getUploadStatus).mockResolvedValueOnce(undefined)
    const res3 = await server.inject({
      ...options,
      headers: { cookie }
    })

    expect(res3.statusCode).toBe(badRequestStatusCode)
  })

  test('GET /file-upload returns handles consumed upload', async () => {
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const options = {
      method: 'GET',
      url: '/file-upload/methodology-statement'
    }

    const res1 = await server.inject(options)

    expect(res1.statusCode).toBe(okStatusCode)

    // Extract the session cookie
    const cookie = getSessionCookie(res1)

    jest.mocked(getUploadStatus).mockResolvedValue(pendingStatusResponse)
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const res2 = await server.inject({
      ...options,
      headers: { cookie }
    })

    expect(res2.statusCode).toBe(okStatusCode)
  })

  test('POST /file-upload with pending file returns 200 with errors', async () => {
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)

    const options = {
      method: 'GET',
      url: '/file-upload/methodology-statement'
    }

    const res1 = await server.inject(options)

    expect(res1.statusCode).toBe(okStatusCode)

    // Extract the session cookie
    const cookie = getSessionCookie(res1)

    jest.mocked(getUploadStatus).mockResolvedValue(pendingStatusResponse)
    const res2 = await server.inject({
      method: 'POST',
      url: '/file-upload/methodology-statement',
      headers: { cookie }
    })

    expect(res2.statusCode).toBe(okStatusCode)
    const $ = load(res2.payload)

    expect(
      $('.govuk-error-summary__list li:nth-child(1) a').text().trim()
    ).toBe('The selected file has not fully uploaded')

    expect(
      $('.govuk-error-summary__list li:nth-child(2) a').text().trim()
    ).toBe('Upload your methodology statement must contain at least 2 items')

    expect($('#XIwyEs-error').text().trim()).toBe(
      'Error: Upload your methodology statement must contain at least 2 items'
    )
    expect(
      $('.govuk-summary-list .govuk-summary-list__key .govuk-error-message')
        .text()
        .trim()
    ).toBe('The selected file has not fully uploaded')
  })

  test('POST /file-upload with 2 valid files returns 302 to /summary', async () => {
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)
    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)

    const options = {
      method: 'GET',
      url: '/file-upload/methodology-statement'
    }

    const res1 = await server.inject(options)

    expect(res1.statusCode).toBe(okStatusCode)

    // Extract the session cookie
    const cookie = getSessionCookie(res1)

    const res2 = await server.inject({
      method: 'GET',
      url: '/file-upload/methodology-statement',
      headers: { cookie }
    })

    expect(res2.statusCode).toBe(okStatusCode)

    const res3 = await server.inject({
      method: 'POST',
      url: '/file-upload/methodology-statement',
      headers: { cookie }
    })

    expect(res3.statusCode).toBe(redirectStatusCode)
    expect(res3.headers.location).toBe('/file-upload/summary')
  })

  test('POST /file-upload with remove deletes the file', async () => {
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)
    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)

    const options = {
      method: 'GET',
      url: '/file-upload/methodology-statement'
    }

    const res1 = await server.inject(options)

    expect(res1.statusCode).toBe(okStatusCode)

    // Extract the session cookie
    const cookie = getSessionCookie(res1)

    const res2 = await server.inject({
      method: 'GET',
      url: '/file-upload/methodology-statement',
      headers: { cookie }
    })

    expect(res2.statusCode).toBe(okStatusCode)

    const res3 = await server.inject({
      method: 'POST',
      url: '/file-upload/methodology-statement',
      headers: { cookie },
      payload: {
        __remove: '15b2303c-9965-4632-acb6-0776081e0399'
      }
    })

    expect(res3.statusCode).toBe(redirectStatusCode)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */

/**
 * @typedef {import('~/src/server/plugins/engine/types.js').UploadInitiateResponse} UploadInitiateResponse
 * @typedef {import('~/src/server/plugins/engine/types.js').UploadStatusResponse} UploadStatusResponse
 */
