import Boom from '@hapi/boom'
import { type ResponseObject, type ResponseToolkit } from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'
import { ValidationError } from 'joi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  checkEmailAddressForLiveFormSubmission,
  checkFormStatus,
  encodeUrl,
  getErrors,
  proceed,
  redirectUrl
} from '~/src/server/plugins/engine/helpers.js'
import { type FormContextRequest } from '~/src/server/plugins/engine/types.js'
import { FormStatus } from '~/src/server/routes/types.js'

describe('Helpers', () => {
  let request: FormContextRequest
  let h: Pick<ResponseToolkit, 'redirect'>

  beforeEach(() => {
    const pageUrl = new URL('http://example.com/test/page-one')

    request = {
      method: 'get',
      url: pageUrl,
      path: pageUrl.pathname,
      params: {
        path: 'page-one',
        slug: 'test'
      },
      query: {}
    }

    const response = {
      code: jest.fn().mockImplementation(() => response)
    }

    h = {
      redirect: jest.fn().mockImplementation(() => response)
    }
  })

  describe('proceed', () => {
    it.each([
      {
        href: 'https://www.gov.uk/help/privacy-notice',

        request: {
          method: 'get'
        } satisfies Partial<FormContextRequest>,

        redirect: {
          statusCode: StatusCodes.MOVED_TEMPORARILY
        } satisfies Partial<ResponseObject>
      },
      {
        href: '/test/page-two',

        request: {
          method: 'get'
        } satisfies Partial<FormContextRequest>,

        redirect: {
          statusCode: StatusCodes.MOVED_TEMPORARILY
        } satisfies Partial<ResponseObject>
      },
      {
        href: '/test/page-two',

        request: {
          method: 'post'
        } satisfies Partial<FormContextRequest>,

        redirect: {
          statusCode: StatusCodes.SEE_OTHER
        } satisfies Partial<ResponseObject>
      }
    ])(
      'should redirect to the path provided',
      ({ href, redirect, ...options }) => {
        request = { ...request, ...options.request }

        const response = proceed(request, h, href)

        expect(h.redirect).toHaveBeenCalledWith(href)
        expect(response.code).toHaveBeenCalledWith(redirect.statusCode)
      }
    )

    it.each([
      {
        href: '/test/page-two',

        request: {
          method: 'get',
          query: {
            myParam1: 'myValue1',
            myParam2: 'myValue2',
            returnUrl: '/test/summary'
          }
        } satisfies Partial<FormContextRequest>,

        redirect: {
          statusCode: StatusCodes.MOVED_TEMPORARILY
        } satisfies Partial<ResponseObject>
      },
      {
        href: '/test/page-two',

        request: {
          method: 'post',
          query: {
            myParam1: 'myValue1',
            myParam2: 'myValue2',
            returnUrl: '/test/summary'
          }
        } satisfies Partial<FormContextRequest>,

        redirect: {
          statusCode: StatusCodes.SEE_OTHER
        } satisfies Partial<ResponseObject>
      }
    ])(
      "should redirect to the 'returnUrl' query param provided (relative paths)",
      ({ href, redirect, ...options }) => {
        request = { ...request, ...options.request }

        const response = proceed(request, h, href)

        expect(h.redirect).toHaveBeenCalledWith(request.query.returnUrl)
        expect(response.code).toHaveBeenCalledWith(redirect.statusCode)
      }
    )

    it.each([
      {
        href: '/test/page-two',

        request: {
          method: 'get',
          query: { returnUrl: 'slash-missing' }
        } satisfies Partial<FormContextRequest>,

        redirect: {
          statusCode: StatusCodes.MOVED_TEMPORARILY
        } satisfies Partial<ResponseObject>
      },
      {
        href: '/test/page-two',

        request: {
          method: 'post',
          query: { returnUrl: 'https://www.gov.uk/help/privacy-notice' }
        } satisfies Partial<FormContextRequest>,

        redirect: {
          statusCode: StatusCodes.SEE_OTHER
        } satisfies Partial<ResponseObject>
      }
    ])(
      "should not redirect to the 'returnUrl' query param provided (other paths)",
      ({ href, ...options }) => {
        request = { ...request, ...options.request }

        proceed(request, h, href)
        expect(h.redirect).not.toHaveBeenCalledWith(request.query.returnUrl)
      }
    )
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

      expect(getErrors(details)).toEqual([
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

      expect(getErrors(details)).toEqual([
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
