import { FormStatus } from '@defra/forms-model'

import { FormRowStatus } from '~/src/server/constants.js'
import {
  getFormStatus,
  getInflightSessionKey,
  getPayloadFromFlash,
  hasState
} from '~/src/server/routes/save-and-exit-helper.js'

describe('save-and-exit-helper tests', () => {
  describe('getPayloadFromFlash', () => {
    test('calls flash', () => {
      const mockRequest = {
        yar: { flash: jest.fn().mockReturnValueOnce('flash-content') }
      }
      // @ts-expect-error - partial mock of request
      const res = getPayloadFromFlash(mockRequest)
      expect(res).toBe('flash-content')
    })
  })

  describe('hasState', () => {
    test('returns true if some state', () => {
      expect(hasState({ field1: 'val1' })).toBe(true)
    })

    test('returns false if no state', () => {
      expect(hasState({})).toBe(false)
    })
  })

  describe('getInflightSessionKey', () => {
    test('builds key from slug with no state', () => {
      expect(getInflightSessionKey('my-form', undefined)).toBe(
        'inFlightForms:my-form:'
      )
    })

    test('builds key from slug and state', () => {
      expect(getInflightSessionKey('my-form', FormStatus.Draft)).toBe(
        'inFlightForms:my-form:draft'
      )
      expect(getInflightSessionKey('my-form', FormStatus.Live)).toBe(
        'inFlightForms:my-form:live'
      )
    })
  })

  describe('getFormStatus', () => {
    test('returns "Deleted" if it is deleted', () => {
      expect(
        getFormStatus(/** @type {SavedFormState}*/ ({ isDeleted: true }))
      ).toBe(FormRowStatus.Deleted)
    })

    test('returns "Processing" if it is processing', () => {
      expect(
        getFormStatus(/** @type {SavedFormState}*/ ({ isProcessing: true }))
      ).toBe(FormRowStatus.Processing)
    })

    test('returns "Expired" if it is expired', () => {
      expect(
        getFormStatus(
          /** @type {SavedFormState}*/ ({ expireAt: '2000-01-01T00:00:00' })
        )
      ).toBe(FormRowStatus.Expired)
    })

    test('returns "InProgress" if it is neither expired or deleted', () => {
      const now = new Date()
      now.setFullYear(now.getFullYear() + 1)
      expect(
        getFormStatus(
          /** @type {SavedFormState}*/ ({ expireAt: now.toISOString() })
        )
      ).toBe(FormRowStatus.InProgress)
    })
  })
})

/**
 * @import { SavedFormState } from '~/src/server/services/submissionService.js'
 */
