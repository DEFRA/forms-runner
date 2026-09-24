import {
  SavedFormStatus,
  getFormStatus,
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

  describe('getFormStatus', () => {
    test('returns "Deleted" if it is deleted', () => {
      expect(getFormStatus(/** @type {SavedForm}*/ ({ isDeleted: true }))).toBe(
        SavedFormStatus.Deleted
      )
    })

    test('returns "Expired" if it is expired', () => {
      expect(
        getFormStatus(
          /** @type {SavedForm}*/ ({ expireAt: '2000-01-01T00:00:00' })
        )
      ).toBe(SavedFormStatus.Expired)
    })

    test('returns "InProgress" if it is neither expired or deleted', () => {
      const now = new Date()
      now.setFullYear(now.getFullYear() + 1)
      expect(
        getFormStatus(/** @type {SavedForm}*/ ({ expireAt: now.toISOString() }))
      ).toBe(SavedFormStatus.InProgress)
    })
  })
})

/**
 * @import { SavedForm } from '~/src/server/services/submissionService.js'
 */
