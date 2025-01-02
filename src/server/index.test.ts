import { type Server } from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'

import { createServer } from '~/src/server/index.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/plugins/engine/services/formsService.js'
import { FormStatus } from '~/src/server/routes/types.js'
import * as fixtures from '~/test/fixtures/index.js'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

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
        url: '/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(res.headers.location).toBe('/slug/page-one')
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
        url: '/preview/live/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(res.headers.location).toBe('/preview/live/slug/page-one')
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
        url: '/preview/draft/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(res.headers.location).toBe('/preview/draft/slug/page-one')
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
        url: '/slug/page-one'
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
        url: '/preview/live/slug/page-one'
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
        url: '/preview/draft/slug/page-one'
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
        url: '/slug/page-one'
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
        url: '/slug/page-one'
      }

      const res1 = await server.inject(options1)

      expect(res1.statusCode).toBe(StatusCodes.OK)
      expect(getCacheSize()).toBe(1)

      // Populate live/preview cache item
      const options2 = {
        method: 'GET',
        url: '/preview/live/slug/page-one'
      }

      const res2 = await server.inject(options2)

      expect(res2.statusCode).toBe(StatusCodes.OK)
      expect(getCacheSize()).toBe(2)

      // Populate draft/preview cache item
      const options3 = {
        method: 'GET',
        url: '/preview/draft/slug/page-one'
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
        url: '/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Dispatch preview page without the correct draft state returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(fixtures.form.metadata)

      const options = {
        method: 'GET',
        url: '/preview/draft/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Dispatch preview page without the correct live state returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(fixtures.form.metadata)

      const options = {
        method: 'GET',
        url: '/preview/live/slug'
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
        url: '/slug'
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
        url: '/preview/draft/slug'
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
        url: '/preview/live/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Get page without the correct state returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(fixtures.form.metadata)

      const options = {
        method: 'GET',
        url: '/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Get preview page without the correct draft state returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(fixtures.form.metadata)

      const options = {
        method: 'GET',
        url: '/preview/draft/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(getCacheSize()).toBe(0)
    })

    test('Get preview page without the correct live state returns 404', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(fixtures.form.metadata)

      const options = {
        method: 'GET',
        url: '/preview/live/slug/page-one'
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
        url: '/slug/page-one'
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
        url: '/preview/draft/slug/page-one'
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
        url: '/preview/live/slug/page-one'
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
