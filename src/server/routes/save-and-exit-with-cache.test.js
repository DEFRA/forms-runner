import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import { StatusCodes } from 'http-status-codes'

import { createServer } from '~/src/server/index.js'
import {
  getFormMetadataById,
  validateSaveAndExitCredentials
} from '~/src/server/services/formsService.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/helpers/error-helper.js')
jest.mock('@defra/forms-engine-plugin/engine/helpers.js')

describe('Save-and-exit check routes', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const FORM_ID = 'eab6ac6c-79b6-439f-bd94-d93eb121b3f1'
  const MAGIC_LINK_ID = 'fd4e6453-fb32-43e4-b4cf-12b381a713de'

  describe('/resume-form-verify/{formId}/{magicLinkId}/{slug}/{state?}', () => {
    test('/route handles valid password with no supplied form status', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({
          slug: 'my-form-to-resume',
          title: 'My Form To Resume'
        })
      jest.mocked(validateSaveAndExitCredentials).mockResolvedValueOnce({
        validPassword: true,
        invalidPasswordAttempts: 1,
        // @ts-expect-error - allow partial objects for tests
        form: {
          id: FORM_ID
        }
      })
      // @ts-expect-error - not all method mocked
      jest.mocked(getCacheService).mockImplementationOnce(() => ({
        setState: jest.fn()
      }))

      const options = {
        method: 'POST',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume`,
        payload: {
          securityAnswer: 'valid'
        }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `/resume-form-success/my-form-to-resume`
      )
    })

    test('/route handles valid password with draft preview', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({
          slug: 'my-form-to-resume',
          title: 'My Form To Resume'
        })
      jest.mocked(validateSaveAndExitCredentials).mockResolvedValueOnce({
        validPassword: true,
        invalidPasswordAttempts: 1,
        // @ts-expect-error - allow partial objects for tests
        form: {
          id: FORM_ID,
          status: 'draft',
          isPreview: true
        }
      })
      // @ts-expect-error - not all method mocked
      jest.mocked(getCacheService).mockImplementationOnce(() => ({
        setState: jest.fn()
      }))

      const options = {
        method: 'POST',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume`,
        payload: {
          securityAnswer: 'valid'
        }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `/resume-form-success/my-form-to-resume/draft`
      )
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
