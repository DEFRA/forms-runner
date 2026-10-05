import { getValidationErrorsFromSession } from '~/src/server/helpers/error-helper.js'

const mockFlash = jest.fn()

/**
 *
 * @param {Request['payload']} payload
 */
const buildMockRequest = (payload) => {
  const yar = /** @type {Yar}} */ ({
    flash: mockFlash,
    id: '',
    reset: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    clear: jest.fn(),
    touch: jest.fn(),
    lazy: jest.fn(),
    commit: jest.fn()
  })

  const res = /** @type {Request} */ ({
    payload,
    yar
  })
  return res
}

describe('Validation functions', () => {
  describe('getValidationErrorsFromSession', () => {
    test('should get errors', () => {
      const sessionKey = /** @type {ValidationSessionKey} */ ('this-key')
      const payload = { field1: 'abc' }
      getValidationErrorsFromSession(buildMockRequest(payload).yar, sessionKey)
      expect(mockFlash).toHaveBeenCalledWith('this-key')
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { Yar, ValidationSessionKey } from '@hapi/yar'
 */
