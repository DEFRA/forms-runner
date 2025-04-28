import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { FormStatus } from '~/src/server/routes/types.js'

describe('Legacy Redirect Routes', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  beforeAll(async () => {
    server = await createServer({})
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('GET /preview/{state}/{slug}', () => {
    it('should permanently redirect valid live preview paths', async () => {
      const state = FormStatus.Live
      const slug = 'my-valid-slug'
      const response = await server.inject({
        method: 'GET',
        url: `/preview/${state}/${slug}`
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_PERMANENTLY)
      expect(response.headers.location).toBe(
        `${FORM_PREFIX}/preview/${state}/${slug}`
      )
    })

    it('should permanently redirect valid draft preview paths', async () => {
      const state = FormStatus.Draft
      const slug = 'another-slug-123'
      const response = await server.inject({
        method: 'GET',
        url: `/preview/${state}/${slug}`
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_PERMANENTLY)
      expect(response.headers.location).toBe(
        `${FORM_PREFIX}/preview/${state}/${slug}`
      )
    })

    it('should return 404 for invalid state', async () => {
      const state = 'invalid-state'
      const slug = 'my-valid-slug'
      const response = await server.inject({
        method: 'GET',
        url: `/preview/${state}/${slug}`
      })

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
    })

    it('should return 404 for invalid slug', async () => {
      const state = FormStatus.Live
      const slug = 'InvalidSlugWithCaps'
      const response = await server.inject({
        method: 'GET',
        url: `/preview/${state}/${slug}`
      })

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
    })

    it('should return 404 for invalid state and slug', async () => {
      const state = 'bad'
      const slug = 'BadSlug'
      const response = await server.inject({
        method: 'GET',
        url: `/preview/${state}/${slug}`
      })

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
    })
  })

  describe('GET /{slug}/{path*}', () => {
    it('should permanently redirect valid paths with path segments', async () => {
      const slug = 'my-valid-slug'
      const path = 'page-one/sub-page'
      const response = await server.inject({
        method: 'GET',
        url: `/${slug}/${path}`
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_PERMANENTLY)
      expect(response.headers.location).toBe(`${FORM_PREFIX}/${slug}/${path}`)
    })

    it('should permanently redirect valid paths with single path segment', async () => {
      const slug = 'another-slug'
      const path = 'summary'
      const response = await server.inject({
        method: 'GET',
        url: `/${slug}/${path}`
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_PERMANENTLY)
      expect(response.headers.location).toBe(`${FORM_PREFIX}/${slug}/${path}`)
    })

    it('should return 404 for invalid slug', async () => {
      const slug = 'InvalidSlug'
      const path = 'page-one'
      const response = await server.inject({
        method: 'GET',
        url: `/${slug}/${path}`
      })

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
    })
  })

  describe('GET /{slug}', () => {
    it('should permanently redirect valid paths with only a slug', async () => {
      const slug = 'my-valid-slug-123'
      const response = await server.inject({
        method: 'GET',
        url: `/${slug}`
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_PERMANENTLY)
      expect(response.headers.location).toBe(`${FORM_PREFIX}/${slug}`)
    })

    it('should return 404 for invalid slug', async () => {
      const slug = 'Invalid-Slug!'
      const response = await server.inject({
        method: 'GET',
        url: `/${slug}`
      })

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
    })
  })
})
