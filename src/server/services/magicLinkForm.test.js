import Boom from '@hapi/boom'

import { getFormMetadataById } from '~/src/server/services/formMetadataGuards.js'
import { getMagicLinkForm } from '~/src/server/services/magicLinkForm.js'

jest.mock('~/src/server/services/formMetadataGuards.js')

const form = { id: 'form-1', slug: 'my-form' }

describe('getMagicLinkForm', () => {
  it('returns the form', async () => {
    jest
      .mocked(getFormMetadataById)
      // @ts-expect-error - allow partial objects for tests
      .mockResolvedValueOnce(form)

    await expect(getMagicLinkForm('form-1', 'link-1')).resolves.toBe(form)
  })

  it('throws the offline error on', async () => {
    const offlineErr = Boom.boomify(new Error('offline'), {
      statusCode: 503,
      data: { offline: true, metadata: form }
    })
    jest.mocked(getFormMetadataById).mockRejectedValueOnce(offlineErr)

    await expect(getMagicLinkForm('form-1', 'link-1')).rejects.toBe(offlineErr)
  })

  it('returns undefined when the form cannot be read', async () => {
    jest
      .mocked(getFormMetadataById)
      .mockRejectedValueOnce(new Error('not found'))

    await expect(getMagicLinkForm('form-1', 'link-1')).resolves.toBeUndefined()
  })
})
