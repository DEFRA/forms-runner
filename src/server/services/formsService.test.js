import { FormStatus } from '@defra/forms-engine-plugin/types'
import { StatusCodes } from 'http-status-codes'

import {
  getFormDefinition,
  getFormMetadata,
  getFormMetadataById,
  getSaveAndExitDetails,
  validateSaveAndExitCredentials
} from '~/src/server/services/formsService.js'
import { getJson, postJson } from '~/src/server/services/httpService.js'
import * as fixtures from '~/test/fixtures/index.js'

const { MANAGER_URL, SUBMISSION_URL } = process.env

const magicLinkId = '7ac201b2-bea3-490d-8ccb-2734b2794f7b'

jest.mock('~/src/server/services/httpService')

describe('Forms service', () => {
  const { definition, metadata } = fixtures.form

  describe('getFormMetadata', () => {
    beforeEach(() => {
      jest.mocked(getJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: metadata
      })
    })

    it('requests JSON via form slug', async () => {
      await getFormMetadata(metadata.slug)

      expect(getJson).toHaveBeenCalledWith(
        `${MANAGER_URL}/forms/slug/${metadata.slug}`
      )
    })

    it('coerces timestamps from string to Date', async () => {
      const payload = {
        ...structuredClone(metadata),

        // JSON payload uses string dates in transit
        createdAt: metadata.createdAt.toISOString(),
        updatedAt: metadata.updatedAt.toISOString()
      }

      jest.mocked(getJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload
      })

      await expect(getFormMetadata(metadata.slug)).resolves.toEqual({
        ...metadata,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        privacyNoticeType: 'link'
      })
    })

    it('throws when validation error', async () => {
      jest.mocked(getJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: { invalid: '123' }
      })

      await expect(() => getFormMetadata(metadata.slug)).rejects.toThrow(
        '"title" is required'
      )
    })
  })

  describe('getFormMetadataById', () => {
    beforeEach(() => {
      jest.mocked(getJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: metadata
      })
    })

    it('requests JSON via form slug', async () => {
      await getFormMetadataById(metadata.id)

      expect(getJson).toHaveBeenCalledWith(
        `${MANAGER_URL}/forms/${metadata.id}`
      )
    })

    it('coerces timestamps from string to Date', async () => {
      const payload = {
        ...structuredClone(metadata),

        // JSON payload uses string dates in transit
        createdAt: metadata.createdAt.toISOString(),
        updatedAt: metadata.updatedAt.toISOString()
      }

      jest.mocked(getJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload
      })

      await expect(getFormMetadataById(metadata.id)).resolves.toEqual({
        ...metadata,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        privacyNoticeType: 'link'
      })
    })

    it('throws when validation error', async () => {
      jest.mocked(getJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: { invalid: '123' }
      })

      await expect(() => getFormMetadataById(metadata.id)).rejects.toThrow(
        '"title" is required'
      )
    })
  })

  describe('getFormDefinition', () => {
    beforeEach(() => {
      jest.mocked(getJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: definition
      })
    })

    it('requests JSON via form ID (draft)', async () => {
      await getFormDefinition(metadata.id, FormStatus.Draft)

      expect(getJson).toHaveBeenCalledWith(
        `${MANAGER_URL}/forms/${metadata.id}/definition/draft`
      )
    })

    it('requests JSON via form ID (live)', async () => {
      await getFormDefinition(metadata.id, FormStatus.Live)

      expect(getJson).toHaveBeenCalledWith(
        `${MANAGER_URL}/forms/${metadata.id}/definition`
      )
    })
  })

  describe('getSaveAndExitDetails', () => {
    beforeEach(() => {
      jest.mocked(getJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: definition
      })
    })

    it('requests JSON via form ID (draft)', async () => {
      await getSaveAndExitDetails(magicLinkId)

      expect(getJson).toHaveBeenCalledWith(
        `${SUBMISSION_URL}/save-and-exit/${magicLinkId}`
      )
    })
  })

  describe('validateSaveAndExitCredentials', () => {
    beforeEach(() => {
      jest.mocked(postJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: definition
      })
    })

    it('requests JSON via form ID (draft)', async () => {
      await validateSaveAndExitCredentials(magicLinkId, 'answer')

      expect(postJson).toHaveBeenCalledWith(
        `${SUBMISSION_URL}/save-and-exit/${magicLinkId}`,
        { payload: { securityAnswer: 'answer' } }
      )
    })
  })
})

/**
 * @import { IncomingMessage } from 'node:http'
 */
