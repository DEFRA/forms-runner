import { resolve } from 'node:path'

import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

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

const basePath = '/file-upload'

jest.mock('~/src/server/plugins/engine/services/uploadService.js')
jest.mock('~/src/server/plugins/engine/services/formsService.js')

const metadata = {
  formId: '66c304662ad3b5fe57210e7c',
  path: `${basePath}/methodology-statement`,
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
      formFileName: 'file-upload.js',
      formFilePath: resolve(import.meta.dirname, '../form/definitions')
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /methodology-statement returns 200', async () => {
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const { container, response } = await renderResponse(server, {
      url: `${basePath}/methodology-statement`
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

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

  test('GET /methodology-statement returns uses cached initiated upload', async () => {
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const res1 = await server.inject({
      url: `${basePath}/methodology-statement`
    })

    expect(res1.statusCode).toBe(StatusCodes.OK)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    jest.mocked(getUploadStatus).mockResolvedValueOnce(initiatedStatusResponse)

    const res2 = await server.inject({
      url: `${basePath}/methodology-statement`,
      headers
    })

    expect(res2.statusCode).toBe(StatusCodes.OK)

    // Assert invalid status response from CDP throws
    jest.mocked(getUploadStatus).mockResolvedValueOnce(undefined)

    const res3 = await server.inject({
      url: `${basePath}/methodology-statement`,
      headers
    })

    expect(res3.statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  test('GET /methodology-statement returns handles consumed upload', async () => {
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const res1 = await server.inject({
      url: `${basePath}/methodology-statement`
    })

    expect(res1.statusCode).toBe(StatusCodes.OK)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const res2 = await server.inject({
      url: `${basePath}/methodology-statement`,
      headers
    })

    expect(res2.statusCode).toBe(StatusCodes.OK)
  })
})

describe('File upload POST tests', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'file-upload.js',
      formFilePath: resolve(import.meta.dirname, '../form/definitions')
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('POST /methodology-statement with 1 file returns 200 with errors', async () => {
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)

    const res1 = await server.inject({
      url: `${basePath}/methodology-statement`
    })

    expect(res1.statusCode).toBe(StatusCodes.OK)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)

    const { container, response } = await renderResponse(server, {
      url: `${basePath}/methodology-statement`,
      method: 'POST',
      headers,
      payload: {}
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $errorSummary = container.getByRole('alert')
    const $errorItems = within($errorSummary).getAllByRole('listitem')

    const $heading = within($errorSummary).getByRole('heading', {
      name: 'There is a problem',
      level: 2
    })

    expect($heading).toBeInTheDocument()

    expect($errorItems[0]).toHaveTextContent(
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

  test('POST /methodology-statement with 2 valid files returns 303 to /summary', async () => {
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)
    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)

    const res1 = await server.inject({
      url: `${basePath}/methodology-statement`
    })

    expect(res1.statusCode).toBe(StatusCodes.OK)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    const res2 = await server.inject({
      url: `${basePath}/methodology-statement`,
      headers
    })

    expect(res2.statusCode).toBe(StatusCodes.OK)

    const res3 = await server.inject({
      url: `${basePath}/methodology-statement`,
      method: 'POST',
      headers,
      payload: {}
    })

    expect(res3.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res3.headers.location).toBe(`${basePath}/summary`)
  })

  test('POST /methodology-statement with remove deletes the file', async () => {
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)
    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)

    const res1 = await server.inject({
      url: `${basePath}/methodology-statement`
    })

    expect(res1.statusCode).toBe(StatusCodes.OK)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    const res2 = await server.inject({
      url: `${basePath}/methodology-statement`,
      headers
    })

    expect(res2.statusCode).toBe(StatusCodes.OK)

    const res3 = await server.inject({
      url: `${basePath}/methodology-statement/15b2303c-9965-4632-acb6-0776081e0399/confirm-delete`,
      headers
    })

    expect(res3.statusCode).toBe(StatusCodes.OK)

    const res4 = await server.inject({
      url: `${basePath}/methodology-statement/15b2303c-9965-4632-acb6-0776081e0399/confirm-delete`,
      method: 'POST',
      headers,
      payload: {
        confirm: true
      }
    })

    expect(res4.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res4.headers.location).toBe(`${basePath}/methodology-statement`)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { UploadInitiateResponse, UploadStatusResponse } from '~/src/server/plugins/engine/types.js'
 */
