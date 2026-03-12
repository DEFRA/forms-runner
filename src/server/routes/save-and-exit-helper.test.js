import {
  generateStateError,
  getPayloadFromFlash
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
    test('returns error message if no state', () => {
      expect(generateStateError({})).toEqual({
        href: '#',
        text: "There is no data held for this form. Please restart your submission or use a previous 'Save and exit' link."
      })
    })

    test('returns undefined if some state', () => {
      expect(generateStateError({ formId: 'abc' })).toBeUndefined()
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { SaveAndExitParams } from '~/src/server/models/save-and-exit.js'
 */
