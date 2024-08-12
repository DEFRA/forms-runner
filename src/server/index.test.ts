import {
  ComponentType,
  type FormDefinition,
  type FormMetadata,
  type FormMetadataAuthor,
  type FormMetadataState
} from '@defra/forms-model'
import { type Server } from '@hapi/hapi'

import { createServer } from '~/src/server/index.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/plugins/engine/services/formsService.js'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

const slug = 'slug'
const id = '661e4ca5039739ef2902b214'
const now = new Date()
const authorId = 'J6PlucvwkmNlYxX9HnSEj27AcJAVx_08IvZ-IPNTvAN'
const authorDisplayName = 'Enrique Chase'
const author: FormMetadataAuthor = {
  id: authorId,
  displayName: authorDisplayName
}

const draft: FormMetadataState = {
  createdAt: now,
  createdBy: author,
  updatedAt: now,
  updatedBy: author
}

const live: FormMetadataState = {
  createdAt: now,
  createdBy: author,
  updatedAt: now,
  updatedBy: author
}

const stubFormMetadata: FormMetadata = {
  id,
  slug: 'test-form',
  title: 'Test form',
  organisation: 'Defra',
  teamName: 'Defra Forms',
  teamEmail: 'defraforms@defra.gov.uk',
  createdAt: now,
  createdBy: author,
  updatedAt: now,
  updatedBy: author
}

const stubFormDefinition: FormDefinition = {
  name: '',
  startPage: '/page-one',
  pages: [
    {
      path: '/page-one',
      title: 'Page one',
      section: 'section',
      components: [
        {
          type: ComponentType.TextField,
          name: 'textField',
          title: 'This is your first field',
          hint: 'Help text',
          options: {},
          schema: {}
        }
      ],
      next: [{ path: '/summary' }]
    },
    {
      title: 'Summary',
      path: '/summary',
      controller: 'SummaryPageController',
      components: []
    }
  ],
  conditions: [],
  sections: [
    {
      name: 'section',
      title: 'Section title',
      hideTitle: false
    }
  ],
  lists: [],
  outputEmail: 'enrique.chase@defra.gov.uk'
}

const okStatusCode = 200
const redirectStatusCode = 302
const notFoundStatusCode = 404

describe('Model cache', () => {
  let server: Server

  const getCacheSize = () => {
    return server.app.models.size
  }

  const getCacheItem = (key) => {
    return server.app.models.get(key)
  }

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    server.app.models.clear()
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('Success responses', () => {
    test('Dispatch page with the correct state returns 302', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, live })

      jest.mocked(getFormDefinition).mockResolvedValue(stubFormDefinition)

      const options = {
        method: 'GET',
        url: `/${slug}`
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(redirectStatusCode)
      expect(res.headers.location).toBe(`/${slug}/page-one`)
      expect(getCacheSize()).toBe(1)
    })

    test('Dispatch preview page with the correct live state returns 302', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, live })

      jest.mocked(getFormDefinition).mockResolvedValue(stubFormDefinition)

      const options = {
        method: 'GET',
        url: `/preview/live/${slug}`
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(redirectStatusCode)
      expect(res.headers.location).toBe(`/preview/live/${slug}/page-one`)
      expect(getCacheSize()).toBe(1)
    })

    test('Dispatch preview page with the correct draft state returns 302', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, draft })

      jest.mocked(getFormDefinition).mockResolvedValue(stubFormDefinition)

      const options = {
        method: 'GET',
        url: `/preview/draft/${slug}`
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(redirectStatusCode)
      expect(res.headers.location).toBe(`/preview/draft/${slug}/page-one`)
      expect(getCacheSize()).toBe(1)
    })

    test('Get page with the correct live state returns 200', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, live })

      jest.mocked(getFormDefinition).mockResolvedValue(stubFormDefinition)

      const options = {
        method: 'GET',
        url: `/${slug}/page-one`
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(okStatusCode)
      expect(getCacheSize()).toBe(1)
    })

    test('Get preview page with the correct live state returns 200', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, live })

      jest.mocked(getFormDefinition).mockResolvedValue(stubFormDefinition)

      const options = {
        method: 'GET',
        url: `/preview/live/${slug}/page-one`
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(okStatusCode)
      expect(getCacheSize()).toBe(1)
    })

    test('Get preview page with the correct draft state returns 200', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, draft })

      jest.mocked(getFormDefinition).mockResolvedValue(stubFormDefinition)

      const options = {
        method: 'GET',
        url: `/preview/draft/${slug}/page-one`
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(okStatusCode)
      expect(getCacheSize()).toBe(1)
    })

    test('Get page with the correct state returns 200', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, live })

      jest.mocked(getFormDefinition).mockResolvedValue(stubFormDefinition)

      const options = {
        method: 'GET',
        url: `/${slug}/page-one`
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(okStatusCode)
      expect(getCacheSize()).toBe(1)
    })

    test('Get page with the correct state populates the cache correctly', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValue({ ...stubFormMetadata, draft, live })

      jest.mocked(getFormDefinition).mockResolvedValue(stubFormDefinition)

      // Populate live/live cache item
      const options1 = {
        method: 'GET',
        url: `/${slug}/page-one`
      }

      const res1 = await server.inject(options1)

      expect(res1.statusCode).toBe(okStatusCode)
      expect(getCacheSize()).toBe(1)

      // Populate live/preview cache item
      const options2 = {
        method: 'GET',
        url: `/preview/live/${slug}/page-one`
      }

      const res2 = await server.inject(options2)

      expect(res2.statusCode).toBe(okStatusCode)
      expect(getCacheSize()).toBe(2)

      // Populate draft/preview cache item
      const options3 = {
        method: 'GET',
        url: `/preview/draft/${slug}/page-one`
      }

      const res3 = await server.inject(options3)

      expect(res3.statusCode).toBe(okStatusCode)
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
        ...stubFormMetadata,
        draft,
        live: { ...live, updatedAt: now2 }
      })

      await server.inject(options1)

      // Expect `getFormDefinition` to be called as the updatedAt has moved on
      expect(getFormDefinition).toHaveBeenLastCalledWith(id, 'live')

      // Assert the live/live cache item has the correct updatedAt timestamp
      expect(getCacheItem(`${id}_live_false`).updatedAt).toBe(now2)

      // Expect the cache size to remain unchanged
      expect(getCacheSize()).toBe(3)

      // Assert the number of times `getFormDefinition`
      // has only been called 4 times for the 7 requests
      expect(getFormDefinition).toHaveBeenCalledTimes(4)
    })
  })

  describe('Error responses', () => {
    test('Dispatch page without the correct state returns 404', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata })

      const options = {
        method: 'GET',
        url: '/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(notFoundStatusCode)
      expect(getCacheSize()).toBe(0)
    })

    test('Dispatch preview page without the correct draft state returns 404', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata })

      const options = {
        method: 'GET',
        url: '/preview/draft/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(notFoundStatusCode)
      expect(getCacheSize()).toBe(0)
    })

    test('Dispatch preview page without the correct live state returns 404', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata })

      const options = {
        method: 'GET',
        url: '/preview/live/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(notFoundStatusCode)
      expect(getCacheSize()).toBe(0)
    })

    test('Dispatch page with the correct live state but no definition returns 404', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, live })
      jest.mocked(getFormDefinition).mockResolvedValue(undefined)

      const options = {
        method: 'GET',
        url: '/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(notFoundStatusCode)
      expect(getCacheSize()).toBe(0)
    })

    test('Dispatch preview page with the correct draft state but no definition returns 404', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, live })
      jest.mocked(getFormDefinition).mockResolvedValue(undefined)

      const options = {
        method: 'GET',
        url: '/preview/draft/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(notFoundStatusCode)
      expect(getCacheSize()).toBe(0)
    })

    test('Dispatch preview page with the correct live state but no definition returns 404', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, live })
      jest.mocked(getFormDefinition).mockResolvedValue(undefined)

      const options = {
        method: 'GET',
        url: '/preview/live/slug'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(notFoundStatusCode)
      expect(getCacheSize()).toBe(0)
    })

    test('Get page without the correct state returns 404', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata })

      const options = {
        method: 'GET',
        url: '/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(notFoundStatusCode)
      expect(getCacheSize()).toBe(0)
    })

    test('Get preview page without the correct draft state returns 404', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata })

      const options = {
        method: 'GET',
        url: '/preview/draft/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(notFoundStatusCode)
      expect(getCacheSize()).toBe(0)
    })

    test('Get preview page without the correct live state returns 404', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata })

      const options = {
        method: 'GET',
        url: '/preview/live/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(notFoundStatusCode)
      expect(getCacheSize()).toBe(0)
    })

    test('Get page with the correct live state but no definition returns 404', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, live })
      jest.mocked(getFormDefinition).mockResolvedValue(undefined)

      const options = {
        method: 'GET',
        url: '/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(notFoundStatusCode)
      expect(getCacheSize()).toBe(0)
    })

    test('Get preview page with the correct draft state but no definition returns 404', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, live })
      jest.mocked(getFormDefinition).mockResolvedValue(undefined)

      const options = {
        method: 'GET',
        url: '/preview/draft/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(notFoundStatusCode)
      expect(getCacheSize()).toBe(0)
    })

    test('Get preview page with the correct live state but no definition returns 404', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValueOnce({ ...stubFormMetadata, live })
      jest.mocked(getFormDefinition).mockResolvedValue(undefined)

      const options = {
        method: 'GET',
        url: '/preview/live/slug/page-one'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(notFoundStatusCode)
      expect(getCacheSize()).toBe(0)
    })
  })

  describe('Help pages', () => {
    test('Contextual help page returns 200', async () => {
      jest
        .mocked(getFormMetadata)
        .mockResolvedValue({ ...stubFormMetadata, draft, live })

      const options = {
        method: 'GET',
        url: `/help/get-support/${slug}`
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(okStatusCode)
    })
  })
})
