import { StatusCodes } from 'http-status-codes'

import { FormStatus } from '~/src/server/routes/types.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/services/formsService.js'
import { getJson } from '~/src/server/services/httpService.js'
import * as fixtures from '~/test/fixtures/index.js'

const { MANAGER_URL } = process.env

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
        updatedAt: expect.any(Date)
      })
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
})

/**
 * @import { IncomingMessage } from 'node:http'
 */
