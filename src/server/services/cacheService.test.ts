import { type Request, type Server } from '@hapi/hapi'

import { config } from '~/src/config/index.js'
import { type FormRequest } from '~/src/server/routes/types.js'
import { CacheService, merge } from '~/src/server/services/cacheService.js'

describe('CacheService', () => {
  let mockServer: Partial<Server>
  let mockCache: {
    get: jest.Mock
    set: jest.Mock
    drop: jest.Mock
  }
  let cacheService: CacheService

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      drop: jest.fn()
    }

    mockServer = {
      cache: (() => ({
        ...mockCache,
        provision: jest.fn()
      })) as unknown as Server['cache'],
      logger: {
        info: jest.fn()
      } as unknown as Server['logger']
    }

    cacheService = new CacheService(mockServer as Server)
  })

  describe('getState', () => {
    describe('when cache exists', () => {
      it('should return cached state', async () => {
        const mockRequest = {
          yar: { id: 'some-session' },
          params: { state: 'form1', slug: 'page1' }
        } as unknown as FormRequest
        const mockState = { someData: 'test' }

        mockCache.get.mockResolvedValue(mockState)

        const result = await cacheService.getState(mockRequest)

        expect(result).toEqual(mockState)
        expect(mockCache.get).toHaveBeenCalledWith({
          segment: 'cache',
          id: 'some-session:form1:page1:'
        })
      })
    })

    describe('when cache does not exist', () => {
      it('should return empty object', async () => {
        const mockRequest = {
          yar: { id: 'some-session' },
          params: { state: 'form1', slug: 'page1' }
        } as unknown as FormRequest

        mockCache.get.mockResolvedValue(null)

        const result = await cacheService.getState(mockRequest)

        expect(result).toEqual({})
      })
    })
  })

  describe('setState', () => {
    it('should set state with correct TTL', async () => {
      const mockRequest = {
        yar: { id: 'some-session' },
        params: { state: 'form1', slug: 'page1' }
      } as unknown as FormRequest
      const mockState = { someData: 'test' }
      const mockTTL = 3600000

      jest.spyOn(config, 'get').mockReturnValue(mockTTL)

      await cacheService.setState(mockRequest, mockState)

      expect(mockCache.set).toHaveBeenCalledWith(
        {
          segment: 'cache',
          id: 'some-session:form1:page1:'
        },
        mockState,
        mockTTL
      )
    })
  })

  describe('Key', () => {
    describe('when session ID is missing', () => {
      it('should throw error', () => {
        const mockRequest = {
          yar: { id: null },
          params: {}
        } as unknown as Request

        expect(() => cacheService.Key(mockRequest)).toThrow(
          'No session ID found'
        )
      })
    })
  })

  describe('merge', () => {
    describe('when merging objects', () => {
      it('should merge them correctly', () => {
        const state = { field1: 'some-data-1', field2: 'some-data-2' }
        const update = { field2: 'updated', field3: 'some-data-3' }

        const result = merge(state, update)

        expect(result).toEqual({
          field1: 'some-data-1',
          field2: 'updated',
          field3: 'some-data-3'
        })
      })
    })

    describe('when merging arrays', () => {
      it('should overwrite instead of merge', () => {
        const state = { items: ['some-item-1', 'some-item-2'] }
        const update = { items: ['some-item-3'] }

        const result = merge(state, update)

        expect(result.items).toEqual(['some-item-3'])
      })
    })
  })

  describe('getFlash', () => {
    describe('when messages exist', () => {
      it('should return first message', () => {
        const mockRequest = {
          yar: {
            id: 'some-session',
            flash: jest.fn().mockReturnValue([{ errors: [{ type: 'error' }] }])
          },
          params: { state: 'form1', slug: 'page1' }
        } as unknown as FormRequest

        const result = cacheService.getFlash(mockRequest)

        expect(result).toEqual({ errors: [{ type: 'error' }] })
      })
    })

    describe('when no messages exist', () => {
      it('should return undefined', () => {
        const mockRequest = {
          yar: {
            id: 'some-session',
            flash: jest.fn().mockReturnValue([])
          },
          params: { state: 'form1', slug: 'page1' }
        } as unknown as FormRequest

        const result = cacheService.getFlash(mockRequest)

        expect(result).toBeUndefined()
      })
    })
  })

  describe('setFlash', () => {
    it('should set flash message', () => {
      const mockRequest = {
        yar: {
          id: 'some-session',
          flash: jest.fn()
        },
        params: { state: 'form1', slug: 'page1' }
      } as unknown as FormRequest
      const message = {
        errors: [
          {
            type: 'error',
            href: '#error',
            name: 'error',
            text: 'Error message',
            path: ['path-abc']
          }
        ]
      }

      cacheService.setFlash(mockRequest, message)

      expect(mockRequest.yar.flash).toHaveBeenCalledWith(
        'some-session:form1:page1:',
        message
      )
    })
  })

  describe('clearState', () => {
    it('should clear state from cache', async () => {
      const mockRequest = {
        yar: { id: 'some-session' },
        params: { state: 'form1', slug: 'page1' }
      } as unknown as FormRequest

      await cacheService.clearState(mockRequest)

      expect(mockCache.drop).toHaveBeenCalledWith({
        segment: 'cache',
        id: 'some-session:form1:page1:'
      })
    })
  })

  describe('getConfirmationState', () => {
    it('should return confirmation state from cache', async () => {
      const mockRequest = {
        yar: { id: 'some-session' },
        params: { state: 'form1', slug: 'page1' }
      } as unknown as FormRequest
      const mockState = { confirmed: true as const }

      mockCache.get.mockResolvedValue(mockState)

      const result = await cacheService.getConfirmationState(mockRequest)

      expect(result).toEqual(mockState)
      expect(mockCache.get).toHaveBeenCalledWith({
        segment: 'cache',
        id: 'some-session:form1:page1::confirmation'
      })
    })

    it('should return empty object when no confirmation state exists', async () => {
      const mockRequest = {
        yar: { id: 'some-session' },
        params: { state: 'form1', slug: 'page1' }
      } as unknown as FormRequest

      mockCache.get.mockResolvedValue(null)

      const result = await cacheService.getConfirmationState(mockRequest)

      expect(result).toEqual({})
    })
  })

  describe('setConfirmationState', () => {
    it('should set confirmation state in cache', async () => {
      const mockRequest = {
        yar: { id: 'some-session' },
        params: { state: 'form1', slug: 'page1' }
      } as unknown as FormRequest
      const mockState = { confirmed: true as const }
      const mockTTL = 3600000

      jest.spyOn(config, 'get').mockReturnValue(mockTTL)

      await cacheService.setConfirmationState(mockRequest, mockState)

      expect(mockCache.set).toHaveBeenCalledWith(
        {
          segment: 'cache',
          id: 'some-session:form1:page1::confirmation'
        },
        mockState,
        mockTTL
      )
    })
  })
})
