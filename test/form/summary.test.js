import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'
import { persistFile } from '~/src/server/plugins/engine/services/formSubmissionService.js'
import * as uploadService from '~/src/server/plugins/engine/services/uploadService.js'
import { FileStatus, UploadStatus } from '~/src/server/plugins/engine/types.js'
import { CacheService } from '~/src/server/services/cacheService.js'
import { getSessionCookie } from '~/test/utils/get-session-cookie.js'

const testDir = dirname(fileURLToPath(import.meta.url))

jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')
jest.mock('~/src/server/plugins/engine/services/uploadService.js')

const okStatusCode = 200
const redirectStatusCode = 302
const htmlContentType = 'text/html'

const readyFile = {
  uploadId: '404a31b2-8ee8-49b5-a6e8-23da9e69ba9e',
  status: {
    uploadStatus: UploadStatus.ready,
    metadata: {
      formId: '66ba2f912aec9371f10b04fd',
      path: '/file-upload/page-one',
      retrievalKey: 'foo.bar@defra.gov.uk'
    },
    form: {
      file: {
        fileId: 'a9e7470b-86a5-4826-a908-360a36aac71d',
        filename: 'api details.pdf',
        contentType: 'application/pdf',
        fileStatus: FileStatus.complete,
        contentLength: 735163,
        checksumSha256: 'zWNFyfw47D528j+CYd/qZQ6adJgGuG47SDJStfIUfmk=',
        detectedContentType: 'application/pdf',
        s3Key:
          'staging/a95c9603-5ddd-4ed3-a912-bc2351a5eb21/a9e7470b-86a5-4826-a908-360a36aac71d',
        s3Bucket: 'my-bucket'
      }
    },
    numberOfRejectedFiles: 0
  }
}

describe('Submission journey test', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'file-upload.json',
      formFilePath: join(testDir, 'definitions')
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /file-upload-component returns 200', async () => {
    jest.spyOn(CacheService.prototype, 'getUploadState').mockResolvedValueOnce({
      upload: undefined,
      files: []
    })

    jest.mocked(uploadService.initiateUpload).mockResolvedValueOnce({
      uploadId: '123-546-789',
      uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-789',
      statusUrl: 'http://localhost:7337/status/123-546-789'
    })

    const res = await server.inject({
      method: 'GET',
      url: '/file-upload/file-upload-component'
    })

    expect(res.statusCode).toEqual(okStatusCode)
    expect(res.headers['content-type']).toContain(htmlContentType)
  })

  test('POST /file-upload-component returns 302', async () => {
    jest.spyOn(CacheService.prototype, 'getUploadState').mockResolvedValueOnce({
      upload: {
        uploadId: '123-546-789',
        uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-789',
        statusUrl: 'http://localhost:7337/status/123-546-789'
      },
      files: []
    })

    jest.mocked(uploadService.getUploadStatus).mockResolvedValueOnce({
      uploadStatus: UploadStatus.initiated,
      metadata: {
        formId: 'dummy',
        path: '/dummy',
        retrievalKey: 'dummy'
      },
      form: {
        file: {
          fileId: 'dummy',
          filename: 'dummy',
          contentType: 'dummy',
          fileStatus: FileStatus.complete,
          contentLength: 0,
          checksumSha256: 'dummy',
          detectedContentType: 'dummy',
          s3Key: 'dummy',
          s3Bucket: 'dummy'
        }
      }
    })

    jest.mocked(uploadService.initiateUpload).mockResolvedValueOnce({
      uploadId: '123-546-790',
      uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-790',
      statusUrl: 'http://localhost:7337/status/123-546-790'
    })

    const form = {
      crumb: 'dummyCrumb',
      fileUploadComponentName: [readyFile]
    }

    // POST the form data to set the state
    const res = await server.inject({
      method: 'POST',
      url: '/file-upload/file-upload-component',
      payload: form
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/file-upload/summary')

    // Extract the session cookie
    const cookie = getSessionCookie(res)

    // GET the summary page
    await server.inject({
      method: 'GET',
      url: '/file-upload/summary',
      headers: { cookie }
    })

    // POST the summary form and assert
    // the mock sendNotification contains
    // the correct personalisation data
    const submitRes = await server.inject({
      method: 'POST',
      url: '/file-upload/summary',
      headers: { cookie },
      payload: {}
    })

    expect(persistFile).toHaveBeenCalledTimes(1)
    expect(submitRes.statusCode).toBe(redirectStatusCode)
    expect(submitRes.headers.location).toBe('/file-upload/status')

    // Finally GET the /{slug}/status page
    const statusRes = await server.inject({
      method: 'GET',
      url: '/file-upload/status',
      headers: { cookie }
    })

    expect(statusRes.statusCode).toBe(okStatusCode)
    expect(statusRes.headers['content-type']).toContain(htmlContentType)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
