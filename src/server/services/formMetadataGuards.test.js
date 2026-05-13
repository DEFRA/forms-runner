import Boom from '@hapi/boom'

import {
  getFormMetadata,
  getFormMetadataById,
  isOfflineBoom
} from '~/src/server/services/formMetadataGuards.js'
import {
  getFormMetadata as rawGetFormMetadata,
  getFormMetadataById as rawGetFormMetadataById
} from '~/src/server/services/formsService.js'

jest.mock('~/src/server/services/formsService.js')

const onlineForm = { id: 'form-1', slug: 'my-form', offline: false }
const offlineForm = { id: 'form-1', slug: 'my-form', offline: true }

describe('formMetadataGuards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getFormMetadata', () => {
    it('returns metadata when the form is not offline', async () => {
      jest
        .mocked(rawGetFormMetadata)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValue(onlineForm)
      await expect(getFormMetadata('my-form')).resolves.toBe(onlineForm)
    })

    it('throws an offline-marker Boom when the form is offline', async () => {
      jest
        .mocked(rawGetFormMetadata)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValue(offlineForm)
      await expect(getFormMetadata('my-form')).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 503 },
        data: { offline: true, metadata: offlineForm }
      })
    })
  })

  describe('getFormMetadataById', () => {
    it('returns metadata when the form is not offline', async () => {
      jest
        .mocked(rawGetFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValue(onlineForm)
      await expect(getFormMetadataById('form-1')).resolves.toBe(onlineForm)
    })

    it('throws an offline-marker Boom when the form is offline', async () => {
      jest
        .mocked(rawGetFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValue(offlineForm)
      await expect(getFormMetadataById('form-1')).rejects.toMatchObject({
        isBoom: true,
        data: { offline: true }
      })
    })
  })

  describe('isOfflineBoom', () => {
    it('returns true for the offline-marker Boom', () => {
      const err = Boom.boomify(new Error('offline'), {
        statusCode: 503,
        data: { offline: true, metadata: offlineForm }
      })
      expect(isOfflineBoom(err)).toBe(true)
    })

    it('returns false for a non-Boom error', () => {
      expect(isOfflineBoom(new Error('boom'))).toBe(false)
    })

    it('returns false for a Boom without the offline marker', () => {
      expect(isOfflineBoom(Boom.notFound('nope'))).toBe(false)
    })
  })
})
