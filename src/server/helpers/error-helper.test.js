import Joi, { ValidationError } from 'joi'

import {
  addErrorsToSession,
  buildErrorDetails,
  getValidationErrorsFromSession
} from '~/src/server/helpers/error-helper.js'

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
  describe('addErrorsToSession', () => {
    test('should add errors', () => {
      const sessionKey = /** @type {ValidationSessionKey} */ ('this-key')
      const error = new Joi.ValidationError(
        'dummy error',
        [
          {
            message: 'error number 1',
            path: ['field-name'],
            type: 'custom',
            context: {
              key: 'field-key',
              label: 'field-key'
            }
          }
        ],
        undefined
      )
      const payload = { field1: 'abc' }
      addErrorsToSession(
        buildMockRequest(payload),
        sessionKey,
        () => 'error number 1',
        error
      )
      expect(mockFlash).toHaveBeenCalledWith('this-key', {
        formErrors: {
          'field-key': {
            href: '#field-key',
            text: 'error number 1'
          }
        },
        formValues: { field1: 'abc' }
      })
    })

    test('should handle no errors', () => {
      const sessionKey = /** @type {ValidationSessionKey} */ ('this-key')
      const error = undefined
      const payload = { field1: 'abc' }
      addErrorsToSession(buildMockRequest(payload), sessionKey, () => '', error)
      expect(mockFlash).not.toHaveBeenCalled()
    })

    test('should handle invalid error object', () => {
      const sessionKey = /** @type {ValidationSessionKey} */ ('this-key')
      const error = /** @type {Joi.ValidationError} */ ({})
      const payload = { field1: 'abc' }
      addErrorsToSession(buildMockRequest(payload), sessionKey, () => '', error)
      expect(mockFlash).not.toHaveBeenCalled()
    })
  })

  describe('getValidationErrorsFromSession', () => {
    test('should get errors', () => {
      const sessionKey = /** @type {ValidationSessionKey} */ ('this-key')
      const payload = { field1: 'abc' }
      getValidationErrorsFromSession(buildMockRequest(payload).yar, sessionKey)
      expect(mockFlash).toHaveBeenCalledWith('this-key')
    })
  })

  describe('buildErrorDetails', () => {
    it('should return errors on first array item', () => {
      const message = 'Enter options separated by a colon'
      const error = new ValidationError(
        message,
        [
          {
            message,
            path: [],
            type: 'unknown',
            context: {
              value: { text: '', value: '' },
              key: 'autoCompleteOptions'
            }
          }
        ],
        { text: '', value: '' }
      )
      expect(
        buildErrorDetails(
          error,
          () => 'Enter options separated by a colon on item 1'
        )
      ).toEqual({
        autoCompleteOptions: {
          text: 'Enter options separated by a colon on item 1',
          href: '#autoCompleteOptions'
        }
      })
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { Yar, ValidationSessionKey } from '@hapi/yar'
 */
