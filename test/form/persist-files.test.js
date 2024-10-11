import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '~/src/server/index.js'
import { persistFiles } from '~/src/server/plugins/engine/services/formSubmissionService.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as uploadService from '~/src/server/plugins/engine/services/uploadService.js'
import { FileStatus, UploadStatus } from '~/src/server/plugins/engine/types.js'
import { CacheService } from '~/src/server/services/cacheService.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const testDir = dirname(fileURLToPath(import.meta.url))

jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')
jest.mock('~/src/server/plugins/engine/services/uploadService.js')
jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/formsService.js')

const okStatusCode = 200
const redirectStatusCode = 302
const htmlContentType = 'text/html'

const readyFile = {
  uploadId: '404a31b2-8ee8-49b5-a6e8-23da9e69ba9e',
  status: {
    uploadStatus: UploadStatus.ready,
    metadata: {
      retrievalKey: 'foo.bar@defra.gov.uk'
    },
    form: {
      file: {
        fileId: 'a9e7470b-86a5-4826-a908-360a36aac71d',
        filename: 'api details.pdf',
        fileStatus: FileStatus.complete,
        contentLength: 735163
      }
    },
    numberOfRejectedFiles: 0
  }
}

const readyFile2 = {
  uploadId: '404a31b2-8ee8-49b5-a6e8-23da9e69ba1f',
  status: {
    uploadStatus: UploadStatus.ready,
    metadata: {
      retrievalKey: 'foo.bar@defra.gov.uk'
    },
    form: {
      file: {
        fileId: 'a9e7470b-86a5-4826-a908-360a36aac72a',
        filename: 'myfile.pdf',
        fileStatus: FileStatus.complete,
        contentLength: 735163
      }
    },
    numberOfRejectedFiles: 0
  }
}

const now = new Date()

/**
 * @satisfies {FormMetadataAuthor}
 */
const author = {
  id: 'J6PlucvwkmNlYxX9HnSEj27AcJAVx_08IvZ-IPNTvAN',
  displayName: 'Enrique Chase'
}

/**
 * @satisfies {FormMetadata}
 */
const stubFormMetadata = {
  id: '661e4ca5039739ef2902b214',
  slug: 'file-upload-2',
  title: 'File upload 2 form',
  organisation: 'Defra',
  teamName: 'Defra Forms',
  teamEmail: 'defraforms@defra.gov.uk',
  submissionGuidance: 'We’ll send you an email to let you know the outcome.',
  createdAt: now,
  createdBy: author,
  updatedAt: now,
  updatedBy: author
}
describe('Submission journey test', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'file-upload-2.json',
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
      url: '/file-upload-2/file-upload-component'
    })

    expect(res.statusCode).toEqual(okStatusCode)
    expect(res.headers['content-type']).toContain(htmlContentType)
  })

  test('POST /file-upload-component returns 302', async () => {
    jest.spyOn(CacheService.prototype, 'getUploadState').mockResolvedValueOnce(
      /** @type {import('~/src/server/plugins/engine/types.js').TempFileState} */ ({
        upload: {
          uploadId: '123-546-788',
          uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-788',
          statusUrl: 'http://localhost:7337/status/123-546-788'
        },
        files: [readyFile, readyFile2]
      })
    )

    jest
      .mocked(uploadService.getUploadStatus)
      .mockResolvedValueOnce(readyFile.status)
      .mockResolvedValueOnce(readyFile2.status)

    jest.mocked(getFormMetadata).mockResolvedValue(stubFormMetadata)

    jest.mocked(uploadService.initiateUpload).mockResolvedValueOnce({
      uploadId: '123-546-790',
      uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-790',
      statusUrl: 'http://localhost:7337/status/123-546-790'
    })

    const form = {
      crumb: 'dummyCrumb'
    }

    // POST the form data to set the state
    const res = await server.inject({
      method: 'POST',
      url: '/file-upload-2/file-upload-component',
      payload: form
    })

    expect(res.statusCode).toEqual(redirectStatusCode)
    expect(res.headers.location).toBe('/file-upload-2/summary')

    // Extract the session cookie
    const headers = getCookieHeader(res, 'session')

    // GET the summary page
    await server.inject({
      method: 'GET',
      url: '/file-upload-2/summary',
      headers
    })

    // POST the summary form and assert
    // the mock sendNotification contains
    // the correct personalisation data
    const submitRes = await server.inject({
      method: 'POST',
      url: '/file-upload-2/summary',
      headers,
      payload: { form }
    })

    expect(persistFiles).toHaveBeenCalledTimes(1)
    expect(submitRes.statusCode).toBe(redirectStatusCode)
    expect(submitRes.headers.location).toBe('/file-upload-2/status')

    // Finally GET the /{slug}/status page
    const statusRes = await server.inject({
      method: 'GET',
      url: '/file-upload-2/status',
      headers
    })

    expect(statusRes.statusCode).toBe(okStatusCode)
    expect(statusRes.headers['content-type']).toContain(htmlContentType)
    expect(persistFiles).toHaveBeenCalledWith(
      [
        {
          fileId: readyFile.status.form.file.fileId,
          initiatedRetrievalKey: readyFile.status.metadata.retrievalKey
        },
        {
          fileId: readyFile2.status.form.file.fileId,
          initiatedRetrievalKey: readyFile2.status.metadata.retrievalKey
        }
      ],
      'enrique.chase@defra.gov.uk'
    )
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { FormMetadata, FormMetadataAuthor } from '@defra/forms-model'
 */
