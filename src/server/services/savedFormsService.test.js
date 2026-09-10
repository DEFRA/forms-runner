import { StatusCodes } from 'http-status-codes'

import { get } from '~/src/server/services/httpService.js'
import { getSavedForms } from '~/src/server/services/savedFormsService.js'

jest.mock('~/src/server/services/httpService')

const { SUBMISSION_URL } = process.env

const ACCESS_TOKEN = 'access-1'
const FORM_ID = '6aa2aeb4376b4f4dcac8c2b1'

/**
 * @param {object} payload
 * @param {number} [statusCode]
 */
function respondWith(payload, statusCode = StatusCodes.OK) {
  jest.mocked(get).mockResolvedValue(
    /** @type {any} */ ({
      res: { statusCode },
      payload
    })
  )
}

describe('savedFormsService', () => {
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

    await expect(getSavedForms(ACCESS_TOKEN, FORM_ID)).resolves.toEqual(records)
  })

  it('reports a refused token rather than returning it as a record', async () => {
    jest.mocked(get).mockResolvedValue(
      /** @type {any} */ ({
        res: { statusCode: StatusCodes.UNAUTHORIZED },
        error: new Error('Unauthorized')
      })
    )

    await expect(getSavedForms(ACCESS_TOKEN, FORM_ID)).rejects.toThrow(
      'Could not read the saved forms'
    )
  })
})
