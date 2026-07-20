import { FormStatus } from '@defra/forms-model'
import Boom from '@hapi/boom'

import { getFormDefinition } from '~/src/server/services/formsService.js'
import { getFormDefinitionWithFallback } from '~/src/server/services/helpers/formsServiceHelper.js'

const formId = 'dfc42e73-cd13-410d-b1a9-e7219b7c62c2'

jest.mock('~/src/server/services/formsService.js')

const draftDefinition = /** @type {FormDefinition} */ ({
  name: 'Draft form name'
})

const liveDefinition = /** @type {FormDefinition} */ ({
  name: 'Live form name'
})

function applyDefaultMock() {
  // eslint-disable-next-line @typescript-eslint/require-await
  jest.mocked(getFormDefinition).mockImplementationOnce(async (_id, status) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    return status === FormStatus.Draft ? draftDefinition : liveDefinition
  })
}

describe('formsServiceHelper', () => {
  describe('getFormDefinitionWithFallback', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return draft definition if exists', async () => {
      applyDefaultMock()
      const res = await getFormDefinitionWithFallback(formId, FormStatus.Draft)
      expect(res?.name).toBe('Draft form name')
    })

    it('should return live definition if draft does not exist', async () => {
      jest.mocked(getFormDefinition).mockImplementationOnce(() => {
        throw Boom.notFound()
      })
      applyDefaultMock()
      const res = await getFormDefinitionWithFallback(formId, FormStatus.Draft)
      expect(res?.name).toBe('Live form name')
    })

    it('should return draft definition if live requested but not exists', async () => {
      jest.mocked(getFormDefinition).mockImplementationOnce(() => {
        throw Boom.notFound()
      })
      applyDefaultMock()
      const res = await getFormDefinitionWithFallback(formId, FormStatus.Live)
      expect(res?.name).toBe('Draft form name')
    })
  })
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
