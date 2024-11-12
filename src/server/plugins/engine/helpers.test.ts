import Boom from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'
import { ValidationError } from 'joi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  checkEmailAddressForLiveFormSubmission,
  checkFormStatus,
  encodeUrl,
  getErrors,
  proceed,
  redirectTo,
  redirectUrl
} from '~/src/server/plugins/engine/helpers.js'
import { FormStatus } from '~/src/server/routes/types.js'
import { type FormRequest } from '~/src/server/routes/types.js'

describe('Helpers', () => {
  let request: Pick<FormRequest, 'query'>
  let h: Pick<ResponseToolkit, 'redirect'>

  beforeEach(() => {
    request = {
      query: {}
    }

    h = {
      redirect: jest.fn()
    }
  })

  describe('proceed', () => {
    it('should redirect to the returnUrl if one is provided', () => {
      request.query.returnUrl = '/my-return-url'

      const nextUrl = 'badgers/monkeys'
      proceed(request, h, nextUrl)

      expect(h.redirect).toHaveBeenCalledTimes(1)
      expect(h.redirect).toHaveBeenCalledWith(request.query.returnUrl)
    })

    it('should redirect to next url when no query params', () => {
      const nextUrl = 'badgers/monkeys'
      proceed(request, h, nextUrl)

      expect(h.redirect).toHaveBeenCalledTimes(1)
      expect(h.redirect).toHaveBeenCalledWith(nextUrl)
    })

    it('should redirect to next url ignoring most params from original request', () => {
      request.query.myParam = 'myValue'
      request.query.myParam2 = 'myValue2'

      const nextUrl = 'badgers/monkeys'
      proceed(request, h, nextUrl)

      expect(h.redirect).toHaveBeenCalledTimes(1)
      expect(h.redirect).toHaveBeenCalledWith(nextUrl)
    })
  })

  describe('redirectTo', () => {
    it('should redirect to next url when no query params in the request', () => {
      const nextUrl = 'badgers/monkeys'
      redirectTo(h, nextUrl)

      expect(h.redirect).toHaveBeenCalledTimes(1)
      expect(h.redirect).toHaveBeenCalledWith(nextUrl)
    })

    it('should redirect to next url ignoring most params from original request', () => {
      request.query.myParam = 'myValue'
      request.query.myParam2 = 'myValue2'

      const nextUrl = 'badgers/monkeys'
      redirectTo(h, nextUrl)

      expect(h.redirect).toHaveBeenCalledTimes(1)
      expect(h.redirect).toHaveBeenCalledWith(nextUrl)
    })
  })

  describe('encodeUrl', () => {
    it.each([
      {
        input: 'http://example.com?myParam=has spaces&more£',
        output: 'http://example.com/?myParam=has%20spaces&more%C2%A3'
      },
      {
        input: 'mailto:hello@example.com?subject=has spaces&body=more£',
        output: 'mailto:hello@example.com?subject=has%20spaces&body=more%C2%A3'
      }
    ])('should percent encode parameters', ({ input, output }) => {
      const returned = encodeUrl(input)
      expect(returned).toBe(output)
    })

    it('should return undefined when no url is provided', () => {
      const returned = encodeUrl()
      expect(returned).toBeUndefined()
    })

    it('should throw when invalid url is provided', () => {
      expect(() => encodeUrl('not a url')).toThrow()
    })
  })

  describe('redirectUrl', () => {
    it('should return target url when no query params in the request', () => {
      const nextUrl = 'badgers/monkeys'
      const returned = redirectUrl(nextUrl)

      expect(returned).toEqual(nextUrl)
    })

    it('should return target url ignoring most params from original request', () => {
      request.query.myParam = 'myValue'
      request.query.myParam2 = 'myValue2'

      const nextUrl = 'badgers/monkeys'
      const returned = redirectUrl(nextUrl)

      expect(returned).toEqual(nextUrl)
    })

    it('should set params from params object', () => {
      const nextUrl = 'badgers/monkeys'

      const returned = redirectUrl(nextUrl, {
        returnUrl: '/myreturnurl',
        badger: 'monkeys'
      })

      expect(returned).toBe(
        `${nextUrl}?returnUrl=%2Fmyreturnurl&badger=monkeys`
      )
    })
  })

  describe('checkFormStatus', () => {
    it('should return true/live for paths starting with PREVIEW_PATH_PREFIX and form is live', () => {
      const path = `${PREVIEW_PATH_PREFIX}/live/another/segment`
      expect(checkFormStatus(path)).toStrictEqual({
        state: FormStatus.Live,
        isPreview: true
      })
    })

    it('should return false for paths not starting with PREVIEW_PATH_PREFIX', () => {
      const path = '/some/other/path'
      expect(checkFormStatus(path)).toStrictEqual({
        state: FormStatus.Live,
        isPreview: false
      })
    })

    it('should be case insensitive and return draft when form is draft', () => {
      const path = `${PREVIEW_PATH_PREFIX.toUpperCase()}/draft/path`
      expect(checkFormStatus(path)).toStrictEqual({
        state: FormStatus.Draft,
        isPreview: true
      })
    })

    it('should throw an error for invalid form state', () => {
      const path = `${PREVIEW_PATH_PREFIX}/invalid-state`
      expect(() => checkFormStatus(path)).toThrow(
        'Invalid form state: invalid-state'
      )
    })
  })

  describe('checkEmailAddressForLiveFormSubmission', () => {
    it('should throw an error if emailAddress is undefined and isPreview is false', () => {
      expect(() =>
        checkEmailAddressForLiveFormSubmission(undefined, false)
      ).toThrow(
        Boom.internal(
          'An email address is required to complete the form submission'
        )
      )
    })

    it('should not throw an error if emailAddress is defined and isPreview is false', () => {
      expect(() =>
        checkEmailAddressForLiveFormSubmission('test@example.com', false)
      ).not.toThrow()
    })

    it('should not throw an error if emailAddress is undefined and isPreview is true', () => {
      expect(() =>
        checkEmailAddressForLiveFormSubmission(undefined, true)
      ).not.toThrow()
    })

    it('should not throw an error if emailAddress is defined and isPreview is true', () => {
      expect(() =>
        checkEmailAddressForLiveFormSubmission('test@example.com', true)
      ).not.toThrow()
    })
  })

  describe('getErrors', () => {
    it('formats dates with ISO strings', () => {
      const { details } = new ValidationError(
        'Date of marriage example',
        [
          {
            message:
              'Date of marriage must be on or before 2021-12-25T00:00:00.000Z',
            path: ['dateField'],
            type: 'date.max',
            context: {
              key: 'dateField',
              title: 'date of marriage'
            }
          }
        ],
        undefined
      )

      expect(getErrors(details)?.errorList).toEqual([
        {
          path: ['dateField'],
          href: '#dateField',
          name: 'dateField',
          text: 'Date of marriage must be on or before 25 December 2021',
          context: {
            key: 'dateField',
            title: 'date of marriage'
          }
        }
      ])
    })

    it('formats first letter to uppercase', () => {
      const { details } = new ValidationError(
        'Date of marriage example',
        [
          {
            message: 'something invalid',
            path: ['yesNoField'],
            type: 'string.pattern.base',
            context: {
              key: 'yesNoField'
            }
          }
        ],
        undefined
      )

      expect(getErrors(details)?.errorList).toEqual([
        {
          path: ['yesNoField'],
          href: '#yesNoField',
          name: 'yesNoField',
          text: 'Something invalid',
          context: {
            key: 'yesNoField'
          }
        }
      ])
    })
  })
})
