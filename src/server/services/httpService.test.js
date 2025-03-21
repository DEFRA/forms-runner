import { getTraceId } from '@defra/hapi-tracing'
import Boom from '@hapi/boom'
import Wreck from '@hapi/wreck'
import { StatusCodes } from 'http-status-codes'

import {
  get,
  getJson,
  post,
  postJson,
  put
} from '~/src/server/services/httpService.js'

jest.mock('@defra/hapi-tracing')

describe('HTTP service', () => {
  /** @type {RequestOptions} */
  let authOptions
  /** @type {RequestOptions} */
  let blankOptions
  /** @type {RequestOptions} */
  let timeoutOptions

  beforeEach(() => {
    authOptions = {
      headers: { Authorization: 'Bearer ey56yDSASDFfbgcbc' }
    }
    blankOptions = {}
    timeoutOptions = {
      timeout: 5000
    }
  })

  describe('GET', () => {
    beforeEach(() => {
      jest.spyOn(Wreck, 'get').mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: undefined
      })
    })

    it('passes headers', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(get('/test', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK }
      })

      expect(Wreck.get).toHaveBeenCalledWith('/test', {
        headers: { 'x-cdp-request-id': 'my-trace-id' }
      })
    })

    it('passes additional headers', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(get('/test', authOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK }
      })

      expect(Wreck.get).toHaveBeenCalledWith('/test', {
        headers: {
          Authorization: 'Bearer ey56yDSASDFfbgcbc',
          'x-cdp-request-id': 'my-trace-id'
        }
      })
    })

    it('passes non headers options', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(get('/test', timeoutOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK }
      })

      expect(Wreck.get).toHaveBeenCalledWith('/test', {
        headers: {
          'x-cdp-request-id': 'my-trace-id'
        },
        timeout: 5000
      })
    })

    it('sends request', async () => {
      await expect(get('/test', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK }
      })

      expect(Wreck.get).toHaveBeenCalledWith('/test', {})
    })

    it('sends request as JSON', async () => {
      await expect(getJson('/test')).resolves.toEqual({
        res: { statusCode: StatusCodes.OK }
      })

      expect(Wreck.get).toHaveBeenCalledWith('/test', { json: true })
    })
  })

  describe('GET (with error)', () => {
    const error = Boom.notFound()

    beforeEach(() => {
      jest.spyOn(Wreck, 'get').mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.NOT_FOUND
        }),
        payload: error
      })
    })

    it('passes headers', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(get('/error', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.get).toHaveBeenCalledWith('/error', {
        headers: { 'x-cdp-request-id': 'my-trace-id' }
      })
    })

    it('passes additional headers', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(get('/error', authOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.get).toHaveBeenCalledWith('/error', {
        headers: {
          Authorization: 'Bearer ey56yDSASDFfbgcbc',
          'x-cdp-request-id': 'my-trace-id'
        }
      })
    })

    it('passes non headers options', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(get('/error', timeoutOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.get).toHaveBeenCalledWith('/error', {
        headers: {
          'x-cdp-request-id': 'my-trace-id'
        },
        timeout: 5000
      })
    })

    it('sends request (with error)', async () => {
      await expect(get('/error', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.get).toHaveBeenCalledWith('/error', {})
    })

    it('sends request as JSON (with error)', async () => {
      await expect(getJson('/error')).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.get).toHaveBeenCalledWith('/error', { json: true })
    })

    it('sends request (unknown error)', async () => {
      jest.spyOn(Wreck, 'get').mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.NOT_FOUND
        }),
        payload: undefined
      })

      await expect(get('/error', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error: new Error('Unknown error')
      })

      expect(Wreck.get).toHaveBeenCalledWith('/error', {})
    })
  })

  describe('POST', () => {
    beforeEach(() => {
      jest.spyOn(Wreck, 'post').mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: { reference: '1234' }
      })
    })

    it('passes headers', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(post('/test', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK },
        payload: { reference: '1234' }
      })

      expect(Wreck.post).toHaveBeenCalledWith('/test', {
        headers: { 'x-cdp-request-id': 'my-trace-id' }
      })
    })

    it('passes additonal headers', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(post('/test', authOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK },
        payload: { reference: '1234' }
      })

      expect(Wreck.post).toHaveBeenCalledWith('/test', {
        headers: {
          Authorization: 'Bearer ey56yDSASDFfbgcbc',
          'x-cdp-request-id': 'my-trace-id'
        }
      })
    })

    it('passes non headers options', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(post('/test', timeoutOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK },
        payload: { reference: '1234' }
      })

      expect(Wreck.post).toHaveBeenCalledWith('/test', {
        headers: {
          'x-cdp-request-id': 'my-trace-id'
        },
        timeout: 5000
      })
    })

    it('sends request', async () => {
      await expect(post('/test', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK },
        payload: { reference: '1234' }
      })

      expect(Wreck.post).toHaveBeenCalledWith('/test', {})
    })

    it('sends request as JSON', async () => {
      await expect(postJson('/test', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK },
        payload: { reference: '1234' }
      })

      expect(Wreck.post).toHaveBeenCalledWith('/test', { json: true })
    })
  })

  describe('POST (with error)', () => {
    const error = Boom.notFound()

    beforeEach(() => {
      jest.spyOn(Wreck, 'post').mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.NOT_FOUND
        }),
        payload: error
      })
    })

    it('passes headers', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(post('/error', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.post).toHaveBeenCalledWith('/error', {
        headers: { 'x-cdp-request-id': 'my-trace-id' }
      })
    })

    it('passes additional headers', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(post('/error', authOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.post).toHaveBeenCalledWith('/error', {
        headers: {
          Authorization: 'Bearer ey56yDSASDFfbgcbc',
          'x-cdp-request-id': 'my-trace-id'
        }
      })
    })

    it('passes non headers options', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(post('/error', timeoutOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.post).toHaveBeenCalledWith('/error', {
        headers: {
          'x-cdp-request-id': 'my-trace-id'
        },
        timeout: 5000
      })
    })

    it('sends request (with error)', async () => {
      await expect(post('/error', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.post).toHaveBeenCalledWith('/error', {})
    })

    it('sends request as JSON (with error)', async () => {
      await expect(postJson('/error', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.post).toHaveBeenCalledWith('/error', { json: true })
    })

    it('sends request (unknown error)', async () => {
      jest.spyOn(Wreck, 'post').mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.NOT_FOUND
        }),
        payload: undefined
      })

      await expect(post('/error', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error: new Error('Unknown error')
      })

      expect(Wreck.post).toHaveBeenCalledWith('/error', {})
    })
  })

  describe('PUT', () => {
    beforeEach(() => {
      jest.spyOn(Wreck, 'put').mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: undefined
      })
    })

    it('passes headers', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(put('/test', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK }
      })

      expect(Wreck.put).toHaveBeenCalledWith('/test', {
        headers: { 'x-cdp-request-id': 'my-trace-id' }
      })
    })

    it('passes additional headers', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(put('/test', authOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK }
      })

      expect(Wreck.put).toHaveBeenCalledWith('/test', {
        headers: {
          Authorization: 'Bearer ey56yDSASDFfbgcbc',
          'x-cdp-request-id': 'my-trace-id'
        }
      })
    })

    it('passes non headers options', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(put('/test', timeoutOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK }
      })

      expect(Wreck.put).toHaveBeenCalledWith('/test', {
        headers: {
          'x-cdp-request-id': 'my-trace-id'
        },
        timeout: 5000
      })
    })

    it('sends request', async () => {
      await expect(put('/test', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.OK }
      })

      expect(Wreck.put).toHaveBeenCalledWith('/test', {})
    })
  })

  describe('PUT (with error)', () => {
    const error = Boom.notFound()

    beforeEach(() => {
      jest.spyOn(Wreck, 'put').mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.NOT_FOUND
        }),
        payload: error
      })
    })

    it('passes headers', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(put('/error', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.put).toHaveBeenCalledWith('/error', {
        headers: { 'x-cdp-request-id': 'my-trace-id' }
      })
    })

    it('passes additional headers', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(put('/error', authOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.put).toHaveBeenCalledWith('/error', {
        headers: {
          Authorization: 'Bearer ey56yDSASDFfbgcbc',
          'x-cdp-request-id': 'my-trace-id'
        }
      })
    })

    it('passes non headers options', async () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')
      await expect(put('/error', timeoutOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.put).toHaveBeenCalledWith('/error', {
        headers: {
          'x-cdp-request-id': 'my-trace-id'
        },
        timeout: 5000
      })
    })

    it('sends request (with error)', async () => {
      await expect(put('/error', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error
      })

      expect(Wreck.put).toHaveBeenCalledWith('/error', {})
    })

    it('sends request (unknown error)', async () => {
      jest.spyOn(Wreck, 'put').mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.NOT_FOUND
        }),
        payload: undefined
      })

      await expect(put('/error', blankOptions)).resolves.toEqual({
        res: { statusCode: StatusCodes.NOT_FOUND },
        error: new Error('Unknown error')
      })

      expect(Wreck.put).toHaveBeenCalledWith('/error', {})
    })
  })
})

/**
 * @import { IncomingMessage } from 'node:http'
 * @import { RequestOptions } from '~/src/server/services/httpService.js'
 */
