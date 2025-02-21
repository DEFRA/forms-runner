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
  getExponentialBackoffDelay,
  getPageHref,
  proceed,
  safeGenerateCrumb
} from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  createPage,
  type PageControllerClass
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { type FormContextRequest } from '~/src/server/plugins/engine/types.js'
import {
  FormAction,
  FormStatus,
  type FormRequest
} from '~/src/server/routes/types.js'
import definition from '~/test/form/definitions/basic.js'

describe('Helpers', () => {
  let page: PageControllerClass
  let request: FormContextRequest
  let h: Pick<ResponseToolkit, 'redirect' | 'view'>

  beforeEach(() => {
    const model = new FormModel(definition, {
      basePath: 'test'
    })

    page = createPage(model, definition.pages[0])
    const pageUrl = new URL(page.href, 'http://example.com')

    request = {
      method: 'get',
      url: pageUrl,
      path: pageUrl.pathname,
      params: {
        path: 'licence',
        slug: 'test'
      },
      query: {},
      app: { model }
    }

    const response = {
      code: jest.fn().mockImplementation(() => response)
    }

    h = {
      redirect: jest.fn().mockImplementation(() => response),
      view: jest.fn()
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
        href: '/test/full-name',

        request: {
          method: 'get'
        } satisfies Partial<FormContextRequest>,

        redirect: {
          statusCode: StatusCodes.MOVED_TEMPORARILY
        } satisfies Partial<ResponseObject>
      },
      {
        href: '/test/full-name',

        request: {
          method: 'post',
          payload: {
            action: FormAction.Validate
          }
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

        expect(h.view).not.toHaveBeenCalled()
        expect(h.redirect).toHaveBeenCalledWith(href)
        expect(response.code).toHaveBeenCalledWith(redirect.statusCode)
      }
    )

    it.each([
      {
        href: '/test/full-name',

        request: {
          method: 'post',
          payload: {
            action: FormAction.Validate
          },
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

        expect(h.view).not.toHaveBeenCalled()
        expect(h.redirect).toHaveBeenCalledWith(request.query.returnUrl)
        expect(response.code).toHaveBeenCalledWith(redirect.statusCode)
      }
    )

    it.each([
      {
        href: '/test/full-name',

        request: {
          method: 'get',
          query: { returnUrl: 'slash-missing' }
        } satisfies Partial<FormContextRequest>,

        redirect: {
          statusCode: StatusCodes.MOVED_TEMPORARILY
        } satisfies Partial<ResponseObject>
      },
      {
        href: '/test/full-name',

        request: {
          method: 'post',
          payload: {
            action: FormAction.Validate
          },
          query: { returnUrl: 'https://www.gov.uk/help/privacy-notice' }
        } satisfies Partial<FormContextRequest>,

        redirect: {
          statusCode: StatusCodes.SEE_OTHER
        } satisfies Partial<ResponseObject>
      },
      {
        href: '/test/repeater/example',

        request: {
          method: 'post',
          query: {
            myParam1: 'myValue1',
            myParam2: 'myValue2',
            returnUrl: '/test/repeater/summary'
          },
          payload: {
            action: FormAction.AddAnother
          }
        } satisfies Partial<FormContextRequest>,

        redirect: {
          statusCode: StatusCodes.MOVED_TEMPORARILY
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

  describe('getPageHref', () => {
    it('should return page href', () => {
      const returned = getPageHref(page)
      expect(returned).toEqual(page.href)
    })

    it('should return page href (path override)', () => {
      const nextPath = '/badgers/monkeys'
      const nextHref = '/test/badgers/monkeys'

      const returned = getPageHref(page, nextPath)
      expect(returned).toEqual(nextHref)
    })

    it('should return page href without query params', () => {
      request.query.myParam = 'myValue'
      request.query.myParam2 = 'myValue2'

      const returned = getPageHref(page)
      expect(returned).toEqual(page.href)
    })

    it('should return page href (path override) without query params', () => {
      request.query.myParam = 'myValue'
      request.query.myParam2 = 'myValue2'

      const nextPath = '/badgers/monkeys'
      const nextHref = '/test/badgers/monkeys'

      const returned = getPageHref(page, nextPath)
      expect(returned).toEqual(nextHref)
    })

    it('should return page href with new query params', () => {
      const returned = getPageHref(page, {
        returnUrl: page.getSummaryPath(),
        badger: 'monkeys'
      })

      expect(returned).toBe(
        `${page.href}?returnUrl=${encodeURIComponent('/summary')}&badger=monkeys`
      )
    })

    it('should return page href (path override) with new query params', () => {
      const nextPath = '/badgers/monkeys'
      const nextHref = '/test/badgers/monkeys'

      const returned = getPageHref(page, nextPath, {
        returnUrl: page.getSummaryPath(),
        badger: 'monkeys'
      })

      expect(returned).toBe(
        `${nextHref}?returnUrl=${encodeURIComponent('/summary')}&badger=monkeys`
      )
    })

    it('should throw when absolute URL is provided', () => {
      expect(() =>
        getPageHref(page, 'https://www.gov.uk/help/privacy-notice')
      ).toThrow('Only relative URLs are allowed')
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

  describe('safeGenerateCrumb', () => {
    it('should return undefined when request.state is missing (malformed request)', () => {
      const malformedRequest = {
        server: {
          plugins: {
            crumb: {
              generate: jest.fn()
            }
          }
        },
        plugins: {},
        route: { settings: { plugins: {} } },
        path: '/test',
        url: { search: '' }
        // state intentionally omitted
      } as unknown as FormRequest

      const crumbToken = safeGenerateCrumb(malformedRequest)
      expect(crumbToken).toBeUndefined()
      expect(
        malformedRequest.server.plugins.crumb.generate
      ).not.toHaveBeenCalled()
    })

    it('should return undefined if crumb is disabled in route settings', () => {
      const requestWithDisabledCrumb = {
        server: {
          plugins: {
            crumb: {
              generate: jest.fn().mockReturnValue('test-token')
            }
          }
        },
        plugins: {},
        route: { settings: { plugins: { crumb: false } } },
        path: '/test',
        url: { search: '' },
        state: {}
      } as unknown as FormRequest

      const crumbToken = safeGenerateCrumb(requestWithDisabledCrumb)
      expect(crumbToken).toBeUndefined()
      expect(
        requestWithDisabledCrumb.server.plugins.crumb.generate
      ).not.toHaveBeenCalled()
    })

    it('should generate crumb when state exists and crumb plugin is available', () => {
      const mockCrumb = 'generated-crumb-value'
      const validRequest = {
        server: {
          plugins: {
            crumb: {
              generate: jest.fn().mockReturnValue(mockCrumb)
            }
          }
        },
        plugins: {},
        route: { settings: { plugins: {} } },
        path: '/test',
        url: { search: '' },
        state: {}
      } as unknown as FormRequest

      const crumbToken = safeGenerateCrumb(validRequest)
      expect(crumbToken).toBe(mockCrumb)
      expect(validRequest.server.plugins.crumb.generate).toHaveBeenCalledWith(
        validRequest
      )
    })
  })

  describe('getExponentialBackoffDelay', () => {
    it.each([
      { depth: 1, expected: 2000 },
      { depth: 2, expected: 4000 },
      { depth: 3, expected: 8000 },
      { depth: 4, expected: 16000 },
      { depth: 5, expected: 30000 },
      { depth: 6, expected: 30000 },
      { depth: 7, expected: 30000 }
    ])(
      'should calculate correct delay for depth $depth',
      ({ depth, expected }) => {
        expect(getExponentialBackoffDelay(depth)).toBe(expected)
      }
    )

    it('should handle depth of 0', () => {
      expect(getExponentialBackoffDelay(0)).toBe(1000)
    })

    it('should handle negative depth', () => {
      expect(getExponentialBackoffDelay(-1)).toBe(500)
    })

    it('should cap at 30 seconds (30000ms) even for large depths', () => {
      // For depth 10: 2000 * 2^(9) would be too high, so it should be capped
      expect(getExponentialBackoffDelay(10)).toBe(30000)
      expect(getExponentialBackoffDelay(20)).toBe(30000)
    })
  })
})
