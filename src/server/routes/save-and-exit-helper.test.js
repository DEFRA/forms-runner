import {
  generateStateError,
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

  describe('generateStateError', () => {
    test('returns error message', () => {
      expect(generateStateError()).toEqual({
        href: '#',
        text: 'Your information is no longer available. Return to the start of the form.'
      })
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
})
