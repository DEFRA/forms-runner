import { FormStatus } from '@defra/forms-model'

import {
  getFormMetadata,
  getFormMetadataById,
  getFormMetadataWithGuard
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
    it('returns metadata', async () => {
      jest
        .mocked(rawGetFormMetadata)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValue(onlineForm)
      await expect(getFormMetadata('my-form')).resolves.toBe(onlineForm)
    })

    it('returns metadata when the form is not offline', async () => {
      jest
        .mocked(rawGetFormMetadata)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValue(onlineForm)
      await expect(
        getFormMetadataWithGuard('my-form', FormStatus.Live)
      ).resolves.toBe(onlineForm)
    })

    it('throws an offline-marker Boom when the form is offline', async () => {
      jest
        .mocked(rawGetFormMetadata)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValue(offlineForm)
      await expect(
        getFormMetadataWithGuard('my-form', FormStatus.Live)
      ).rejects.toMatchObject({
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
})
