import { StatusCodes } from 'http-status-codes'

import { get, getJson, postJson } from '~/src/server/services/httpService.js'
import {
  generateReferenceNumber,
  getSaveAndExitDetails,
  getSavedForms,
  validateSaveAndExitCredentials
} from '~/src/server/services/submissionService.js'
import * as fixtures from '~/test/fixtures/index.js'

jest.mock('~/src/server/services/httpService')

const { SUBMISSION_URL } = process.env

const ACCESS_TOKEN = 'access-1'
const FORM_ID = '6aa2aeb4376b4f4dcac8c2b1'

const magicLinkId = '7ac201b2-bea3-490d-8ccb-2734b2794f7b'

/**
 * @param {object} payload
 * @param {number} [statusCode]
 */
function respondWith(payload, statusCode = StatusCodes.OK) {
  jest.mocked(get).mockResolvedValue(
    /** @type {Awaited<ReturnType<typeof get>>} */ ({
      res: { statusCode },
      payload
    })
  )
}

describe('Submission service', () => {
  const { definition } = fixtures.form

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

    it('throws if no results', async () => {
      // @ts-expect-error - partial mock of payload
      jest.mocked(postJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: undefined
      })

      await expect(() =>
        validateSaveAndExitCredentials(magicLinkId, 'answer')
      ).rejects.toThrow(
        'Unexpected empty response in validateSaveAndExitCredentials'
      )
    })
  })

  describe('generateReferenceNumber', () => {
    it('returns the generated reference number', async () => {
      jest.mocked(postJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: { referenceNumber: 'XXX-XXX-XXX' }
      })

      const referenceNumber = await generateReferenceNumber()

      expect(referenceNumber).toBe('XXX-XXX-XXX')
      expect(postJson).toHaveBeenCalledWith(
        `${SUBMISSION_URL}/submission/generate-reference-number`,
        { payload: {}, timeout: 10 * 1000 } // 10 seconds
      )
    })

    it('returns the generated reference number with prefix', async () => {
      jest.mocked(postJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: { referenceNumber: 'XYZ-XXX-XXX' }
      })

      const referenceNumber = await generateReferenceNumber('XYZ')

      expect(referenceNumber).toBe('XYZ-XXX-XXX')
      expect(postJson).toHaveBeenCalledWith(
        `${SUBMISSION_URL}/submission/generate-reference-number?prefix=XYZ`,
        { payload: {}, timeout: 10 * 1000 } // 10 seconds
      )
    })

    it('throws if no results', async () => {
      // @ts-expect-error - partial mock of payload
      jest.mocked(postJson).mockResolvedValue({
        res: /** @type {IncomingMessage} */ ({
          statusCode: StatusCodes.OK
        }),
        payload: undefined
      })

      await expect(() => generateReferenceNumber()).rejects.toThrow(
        'Unexpected empty response in generateReferenceNumber'
      )
    })
  })

  describe('getSavedForms', () => {
    it('asks the submission API for the forms of one citizen, naming them by the token alone', async () => {
      respondWith([])

      await getSavedForms(ACCESS_TOKEN, FORM_ID)

      expect(get).toHaveBeenCalledWith(
        `${SUBMISSION_URL}/save-and-exit/records?formId=${FORM_ID}`,
        {
          json: true,
          headers: { authorization: `Bearer ${ACCESS_TOKEN}` }
        }
      )
    })

    it('returns the records the API sent', async () => {
      const records = [
        {
          magicLinkId: 'link-1',
          referenceNumber: 'AAA-111',
          formTitle: 'saveandexit',
          createdAt: '2026-09-09T09:00:00.000Z',
          expireAt: '2026-10-07T09:00:00.000Z'
        }
      ]
      respondWith(records)

      await expect(getSavedForms(ACCESS_TOKEN, FORM_ID)).resolves.toEqual(
        records
      )
    })

    it('reports a refused token rather than returning it as a record', async () => {
      jest.mocked(get).mockResolvedValue(
        /** @type {Awaited<ReturnType<typeof get>>} */ ({
          res: { statusCode: StatusCodes.UNAUTHORIZED },
          error: new Error('Unauthorized')
        })
      )

      await expect(getSavedForms(ACCESS_TOKEN, FORM_ID)).rejects.toThrow(
        'Could not read the saved forms'
      )
    })
  })
})

/**
 * @import { IncomingMessage } from 'node:http'
 */
