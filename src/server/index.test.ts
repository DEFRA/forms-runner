import Boom from '@hapi/boom'
import { type Server } from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'

import { createServer } from '~/src/server/index.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/plugins/engine/services/formsService.js'
import { getUploadStatus } from '~/src/server/plugins/engine/services/uploadService.js'
import {
  FileStatus,
  UploadStatus,
  type UploadStatusResponse
} from '~/src/server/plugins/engine/types.js'
import { FormStatus } from '~/src/server/routes/types.js'
import * as fixtures from '~/test/fixtures/index.js'

jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/uploadService.js')

describe('Model cache', () => {
  let server: Server

  const getCacheSize = () => {
    return server.app.models.size
  }

  const getCacheItem = (key: string) => {
    return server.app.models.get(key)
  }

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
    server.app.models.clear()
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('Success responses', () => {
    test('Dispatch page with the correct state returns 302', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        live: fixtures.form.state
      })

      jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)

      const options = {
        method: 'GET',
        url: '/form/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(res.headers.location).toBe('/form/slug/page-one')
      expect(getCacheSize()).toBe(1)
    })

    test('Dispatch preview page with the correct live state returns 302', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        live: fixtures.form.state
      })

      jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)

      const options = {
        method: 'GET',
        url: '/form/preview/live/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(res.headers.location).toBe('/form/preview/live/slug/page-one')
      expect(getCacheSize()).toBe(1)
    })

    test('Dispatch preview page with the correct draft state returns 302', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        draft: fixtures.form.state
      })

      jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)

      const options = {
        method: 'GET',
        url: '/form/preview/draft/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(res.headers.location).toBe('/form/preview/draft/slug/page-one')
      expect(getCacheSize()).toBe(1)
    })

    test('Get page with the correct live state returns 200', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        live: fixtures.form.state
      })

      jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)

      const options = {
        method: 'GET',
        url: '/form/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.OK)
      expect(getCacheSize()).toBe(1)
    })

    test('Get preview page with the correct live state returns 200', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        live: fixtures.form.state
      })

      jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)

      const options = {
        method: 'GET',
        url: '/form/preview/live/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.OK)
      expect(getCacheSize()).toBe(1)
    })

    test('Get preview page with the correct draft state returns 200', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        draft: fixtures.form.state
      })

      jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)

      const options = {
        method: 'GET',
        url: '/form/preview/draft/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.OK)
      expect(getCacheSize()).toBe(1)
    })

    test('Get page with the correct state returns 200', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        live: fixtures.form.state
      })

      jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)

      const options = {
        method: 'GET',
        url: '/form/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.OK)
      expect(getCacheSize()).toBe(1)
    })

    test('Get page with the correct state populates the cache correctly', async () => {
      jest.mocked(getFormMetadata).mockResolvedValue({
        ...fixtures.form.metadata,
        draft: fixtures.form.state,
        live: fixtures.form.state
      })

      jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)

      // Populate live/live cache item
      const options1 = {
        method: 'GET',
        url: '/form/slug/page-one'
      }

      const res1 = await server.inject(options1)

      expect(res1.statusCode).toBe(StatusCodes.OK)
      expect(getCacheSize()).toBe(1)

      // Populate live/preview cache item
      const options2 = {
        method: 'GET',
        url: '/form/preview/live/slug/page-one'
      }

      const res2 = await server.inject(options2)

      expect(res2.statusCode).toBe(StatusCodes.OK)
      expect(getCacheSize()).toBe(2)

      // Populate draft/preview cache item
      const options3 = {
        method: 'GET',
        url: '/form/preview/draft/slug/page-one'
      }

      const res3 = await server.inject(options3)

      expect(res3.statusCode).toBe(StatusCodes.OK)
      expect(getCacheSize()).toBe(3)

      // Execute each request again and
      // assert the cache size is unchanged
      await server.inject(options1)
      await server.inject(options2)
      await server.inject(options3)

      expect(getCacheSize()).toBe(3)

      // Check models cache item is regenerated on an update to the state
      const now2 = new Date()
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        draft: fixtures.form.state,
        live: { ...fixtures.form.state, updatedAt: now2 }
      })

      await server.inject(options1)

      // Expect `getFormDefinition` to be called as the updatedAt has moved on
      expect(getFormDefinition).toHaveBeenLastCalledWith(
        fixtures.form.metadata.id,
        FormStatus.Live
      )

      // Assert the live/live cache item has the correct updatedAt timestamp
      expect(
        getCacheItem(`${fixtures.form.metadata.id}_live_false`)?.updatedAt
      ).toBe(now2)

      // Expect the cache size to remain unchanged
      expect(getCacheSize()).toBe(3)

      // Assert the number of times `getFormDefinition`
      // has only been called 4 times for the 7 requests
      expect(getFormDefinition).toHaveBeenCalledTimes(4)
    })
  })

  describe('Error responses', () => {
    test('Dispatch page without the correct state returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(fixtures.form.metadata)

      const options = {
        method: 'GET',
        url: '/form/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Dispatch preview page without the correct draft state returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(fixtures.form.metadata)

      const options = {
        method: 'GET',
        url: '/form/preview/draft/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Dispatch preview page without the correct live state returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(fixtures.form.metadata)

      const options = {
        method: 'GET',
        url: '/form/preview/live/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Dispatch page with the correct live state but no definition returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        live: fixtures.form.state
      })
      jest.mocked(getFormDefinition).mockResolvedValue(undefined)

      const options = {
        method: 'GET',
        url: '/form/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Dispatch preview page with the correct draft state but no definition returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        live: fixtures.form.state
      })
      jest.mocked(getFormDefinition).mockResolvedValue(undefined)

      const options = {
        method: 'GET',
        url: '/form/preview/draft/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Dispatch preview page with the correct live state but no definition returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        live: fixtures.form.state
      })
      jest.mocked(getFormDefinition).mockResolvedValue(undefined)

      const options = {
        method: 'GET',
        url: '/form/preview/live/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Get page without the correct state returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(fixtures.form.metadata)

      const options = {
        method: 'GET',
        url: '/form/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Get preview page without the correct draft state returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(fixtures.form.metadata)

      const options = {
        method: 'GET',
        url: '/form/preview/draft/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Get preview page without the correct live state returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(fixtures.form.metadata)

      const options = {
        method: 'GET',
        url: '/form/preview/live/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Get page with the correct live state but no definition returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        live: fixtures.form.state
      })
      jest.mocked(getFormDefinition).mockResolvedValue(undefined)

      const options = {
        method: 'GET',
        url: '/form/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Get preview page with the correct draft state but no definition returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        live: fixtures.form.state
      })
      jest.mocked(getFormDefinition).mockResolvedValue(undefined)

      const options = {
        method: 'GET',
        url: '/form/preview/draft/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Get preview page with the correct live state but no definition returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce({
        ...fixtures.form.metadata,
        live: fixtures.form.state
      })
      jest.mocked(getFormDefinition).mockResolvedValue(undefined)

      const options = {
        method: 'GET',
        url: '/form/preview/live/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })
  })

  describe('Help pages', () => {
    test('Contextual help page returns 200', async () => {
      jest.mocked(getFormMetadata).mockResolvedValue({
        ...fixtures.form.metadata,
        draft: fixtures.form.state,
        live: fixtures.form.state
      })

      const options = {
        method: 'GET',
        url: '/help/get-support/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.OK)
    })

    test('Privacy notice page returns 200', async () => {
      jest.mocked(getFormMetadata).mockResolvedValue({
        ...fixtures.form.metadata,
        draft: fixtures.form.state,
        live: fixtures.form.state
      })

      const options = {
        method: 'GET',
        url: '/help/privacy/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.OK)
    })
  })
})

describe('Upload status route', () => {
  let server: Server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('GET /upload-status/{uploadId} returns upload status with 200 when successful', async () => {
    const mockStatus: UploadStatusResponse = {
      uploadStatus: UploadStatus.ready,
      metadata: {
        retrievalKey: 'some-key'
      },
      form: {
        file: {
          fileId: 'some-file-id',
          filename: 'some-file-name',
          contentLength: 1024,
          fileStatus: FileStatus.complete
        }
      },
      numberOfRejectedFiles: 0
    }
    jest.mocked(getUploadStatus).mockResolvedValueOnce(mockStatus)

    const options = {
      method: 'GET',
      url: '/upload-status/123e4567-e89b-12d3-a456-426614174000'
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res.result).toEqual(mockStatus)
    expect(getUploadStatus).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000'
    )
  })

  test('GET /upload-status/{uploadId} returns 400 when status check fails', async () => {
    jest.mocked(getUploadStatus).mockResolvedValueOnce(undefined)

    const options = {
      method: 'GET',
      url: '/upload-status/123e4567-e89b-12d3-a456-426614174000'
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect(res.result).toEqual({ error: 'Status check failed' })
  })

  test('GET /upload-status/{uploadId} returns 500 when exception occurs', async () => {
    jest
      .mocked(getUploadStatus)
      .mockRejectedValueOnce(new Error('Service unavailable'))

    const options = {
      method: 'GET',
      url: '/upload-status/123e4567-e89b-12d3-a456-426614174000'
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(res.result).toEqual({ error: 'Status check error' })
  })

  test('GET /upload-status/{uploadId} returns 400 for invalid uploadId format', async () => {
    const options = {
      method: 'GET',
      url: '/upload-status/not-a-valid-guid'
    }

    const res = await server.inject(options)

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST)
  })
})

describe('onRequest Hook Redirects', () => {
  let server: Server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.resetAllMocks()
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  describe('Legacy /preview/{state}/{slug} redirects', () => {
    test('should redirect valid /preview/live/{slug} to /form/preview/live/{slug}', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/preview/live/my-valid-slug'
      })
      expect(res.statusCode).toBe(StatusCodes.MOVED_PERMANENTLY)
      expect(res.headers.location).toBe('/form/preview/live/my-valid-slug')
    })

    test('should redirect valid /preview/draft/{slug} to /form/preview/draft/{slug}', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/preview/draft/another-slug'
      })
      expect(res.statusCode).toBe(StatusCodes.MOVED_PERMANENTLY)
      expect(res.headers.location).toBe('/form/preview/draft/another-slug')
    })

    test('should return 404, log warning, and throw specific Boom error internally for /preview/{invalid-state}/{slug}', async () => {
      const invalidPath = '/preview/invalid/my-slug'
      const expectedLogMessage = `onRequest: Invalid format for preview path start: ${invalidPath}.`
      const expectedBoomMessage = `Invalid preview path format: ${invalidPath}`

      const loggerWarnSpy = jest.spyOn(server.logger, 'warn')
      const boomNotFoundSpy = jest.spyOn(Boom, 'notFound')

      const res = await server.inject({ method: 'GET', url: invalidPath })

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(loggerWarnSpy).toHaveBeenCalledTimes(1)
      expect(loggerWarnSpy).toHaveBeenCalledWith(expectedLogMessage)
      expect(boomNotFoundSpy).toHaveBeenCalledTimes(1)
      expect(boomNotFoundSpy).toHaveBeenCalledWith(expectedBoomMessage)

      loggerWarnSpy.mockRestore()
      boomNotFoundSpy.mockRestore()
    })
  })

  describe('Legacy /{slug}/{path...} redirects', () => {
    test('should redirect valid /{slug}/{page} to /form/{slug}/{page}', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/my-slug/page-one'
      })
      expect(res.statusCode).toBe(StatusCodes.MOVED_PERMANENTLY)
      expect(res.headers.location).toBe('/form/my-slug/page-one')
    })

    test('should redirect valid /{slug}/{deep/path} to /form/{slug}/{deep/path}', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/another-slug/deep/nested/path'
      })
      expect(res.statusCode).toBe(StatusCodes.MOVED_PERMANENTLY)
      expect(res.headers.location).toBe('/form/another-slug/deep/nested/path')
    })
  })

  describe('Legacy /{slug} redirects', () => {
    test('should redirect valid /{slug} to /form/{slug}', async () => {
      const res = await server.inject({ method: 'GET', url: '/my-slug' })
      expect(res.statusCode).toBe(StatusCodes.MOVED_PERMANENTLY)
      expect(res.headers.location).toBe('/form/my-slug')
    })

    test('should return 404 for /{invalid-slug}', async () => {
      const res = await server.inject({ method: 'GET', url: '/invalid_slug!' })
      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
    })
  })

  test('should continue processing for non-legacy, non-prefixed paths and add the prefix', async () => {
    const res = await server.inject({ method: 'GET', url: '/some/other/path' })
    expect(res.statusCode).toBe(StatusCodes.MOVED_PERMANENTLY)
  })

  test('should continue processing for paths not matching legacy redirect patterns', async () => {
    const pathsToTest = [
      '/',
      '/form/some-slug/some-page',
      '/help/cookies/some-slug',
      '/health',
      '/assets/govuk.css'
    ]

    for (const testPath of pathsToTest) {
      const res = await server.inject({ method: 'GET', url: testPath })

      expect(res.statusCode).not.toBe(StatusCodes.MOVED_PERMANENTLY)
    }
  })
})
