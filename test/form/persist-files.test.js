import { join } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import {
  persistFiles,
  submit
} from '~/src/server/plugins/engine/services/formSubmissionService.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as uploadService from '~/src/server/plugins/engine/services/uploadService.js'
import { FileStatus, UploadStatus } from '~/src/server/plugins/engine/types.js'
import { FormAction } from '~/src/server/routes/types.js'
import { CacheService } from '~/src/server/services/cacheService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/file-upload-basic`

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')
jest.mock('~/src/server/plugins/engine/services/uploadService.js')

/**
 * @satisfies {FileState}
 */
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

/**
 * @satisfies {FileState}
 */
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

describe('Submission journey test', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'file-upload-basic.js',
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

  test('GET /file-upload-component returns 200', async () => {
    jest.spyOn(CacheService.prototype, 'getState').mockResolvedValueOnce({})

    jest.mocked(uploadService.initiateUpload).mockResolvedValueOnce({
      uploadId: '123-546-789',
      uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-789',
      statusUrl: 'http://localhost:7337/status/123-546-789'
    })

    const res = await server.inject({
      url: `${basePath}/file-upload-component`
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res.headers['content-type']).toContain('text/html')
  })

  test('POST /file-upload-component returns 303', async () => {
    jest.spyOn(CacheService.prototype, 'getState').mockResolvedValueOnce(
      // @ts-expect-error - Allow upload property mismatch with `FormState`
      /** @type {FormSubmissionState} */ ({
        upload: {
          '/file-upload-component': {
            files: [readyFile, readyFile2],
            upload: {
              uploadId: '123-546-788',
              uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-788',
              statusUrl: 'http://localhost:7337/status/123-546-788'
            }
          }
        }
      })
    )

    jest
      .mocked(uploadService.getUploadStatus)
      .mockResolvedValueOnce(readyFile.status)
      .mockResolvedValueOnce(readyFile2.status)

    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)

    jest.mocked(uploadService.initiateUpload).mockResolvedValueOnce({
      uploadId: '123-546-790',
      uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-790',
      statusUrl: 'http://localhost:7337/status/123-546-790'
    })

    jest.mocked(submit).mockResolvedValueOnce({
      message: 'Submit completed',
      result: {
        files: {
          main: '00000000-0000-0000-0000-000000000000',
          repeaters: {}
        }
      }
    })

    // POST the form data to set the state
    const res = await server.inject({
      url: `${basePath}/file-upload-component`,
      method: 'POST',
      payload: {
        crumb: 'dummyCrumb',
        action: FormAction.Validate
      }
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/summary`)

    // Extract the session cookie
    const headers = getCookieHeader(res, 'session')

    // GET the summary page
    await server.inject({
      url: `${basePath}/summary`,
      headers
    })

    // POST the summary form and assert
    // the mock sendNotification contains
    // the correct personalisation data
    const submitRes = await server.inject({
      url: `${basePath}/summary`,
      method: 'POST',
      headers,
      payload: {}
    })

    expect(persistFiles).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith({
      main: [
        {
          name: 'fileUpload',
          title: 'Upload something',
          value: [
            'a9e7470b-86a5-4826-a908-360a36aac71d',
            'a9e7470b-86a5-4826-a908-360a36aac72a'
          ].join(',')
        }
      ],
      repeaters: [],
      retrievalKey: 'enrique.chase@defra.gov.uk',
      sessionId: expect.any(String)
    })

    expect(submitRes.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(submitRes.headers.location).toBe(`${basePath}/status`)

    // Finally GET the /{slug}/status page
    const statusRes = await server.inject({
      url: `${basePath}/status`,
      headers
    })

    expect(statusRes.statusCode).toBe(StatusCodes.OK)
    expect(statusRes.headers['content-type']).toContain('text/html')
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
 * @import { FileState, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 */
