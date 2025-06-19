import Boom from '@hapi/boom'
import { type ResponseObject, type ResponseToolkit } from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'
import { ValidationError } from 'joi'

import {
  checkEmailAddressForLiveFormSubmission,
  checkFormStatus,
  encodeUrl,
  engine,
  evaluateTemplate,
  getErrors,
  getExponentialBackoffDelay,
  getPageHref,
  proceed,
  safeGenerateCrumb,
  stripTimeFromDate,
  type GlobalScope
} from '~/src/server/plugins/engine/helpers.js'
import { handleLegacyRedirect } from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  createPage,
  type PageControllerClass
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FormContext,
  type FormContextRequest
} from '~/src/server/plugins/engine/types.js'
import {
  FormAction,
  FormStatus,
  type FormRequest
} from '~/src/server/routes/types.js'
import definition from '~/test/form/definitions/basic.js'
import templateDefinition from '~/test/form/definitions/templates.js'

interface NunjucksContext {
  context: {
    globals: GlobalScope
  }
}

type EvaluateFilter = (this: NunjucksContext, template: unknown) => unknown
type HrefFilter = (this: NunjucksContext, path: string) => string | undefined

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
    it('should return true/live for params that include live state segment', () => {
      expect(
        checkFormStatus({
          state: FormStatus.Live,
          slug: 'another',
          path: 'segment'
        })
      ).toStrictEqual({
        state: FormStatus.Live,
        isPreview: true
      })
    })

    it('should return true/draft for params that include draft state segment', () => {
      expect(
        checkFormStatus({
          state: FormStatus.Draft,
          slug: 'another',
          path: 'segment'
        })
      ).toStrictEqual({
        state: FormStatus.Draft,
        isPreview: true
      })
    })

    it('should return false/live for paths without a state segment', () => {
      expect(
        checkFormStatus({
          slug: 'some',
          path: 'other'
        })
      ).toStrictEqual({
        state: FormStatus.Live,
        isPreview: false
      })
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

    it('does not format the first letter to uppercase', () => {
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
          text: 'something invalid',
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
      { depth: 5, expected: 25000 },
      { depth: 6, expected: 25000 },
      { depth: 7, expected: 25000 }
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

    it('should cap at 25 seconds (25000ms) even for large depths', () => {
      // For depth 10: 2000 * 2^(9) would be too high, so it should be capped
      expect(getExponentialBackoffDelay(10)).toBe(25000)
      expect(getExponentialBackoffDelay(20)).toBe(25000)
    })
  })

  describe('evaluateTemplate', () => {
    let model: FormModel
    let formContext: FormContext

    beforeEach(() => {
      model = new FormModel(templateDefinition, {
        basePath: 'template'
      })

      formContext = {
        evaluationState: {},
        relevantState: {},
        relevantPages: [],
        payload: {},
        state: {},
        paths: [],
        isForceAccess: false,
        data: {},
        pageDefMap: model.pageDefMap,
        listDefMap: model.listDefMap,
        componentDefMap: model.componentDefMap,
        pageMap: model.pageMap,
        componentMap: model.componentMap
      }
    })

    it('should replace placeholders with values from form context relevantState', () => {
      Object.assign(formContext.relevantState, {
        WmHfSb: 'Enrique Chase'
      })

      const areYouInEngland = templateDefinition.pages[2]
      expect(areYouInEngland.title).toBe('Are you in England, {{ WmHfSb }}?')

      const result = evaluateTemplate(areYouInEngland.title, formContext)
      expect(result).toBe('Are you in England, Enrique Chase?')
    })

    it('should replace placeholders with values from form context data', () => {
      Object.assign(formContext.data, {
        score: 'Low'
      })

      const result = evaluateTemplate(
        'Your score is: {{ context.data.score }}',
        formContext
      )

      expect(result).toBe('Your score is: Low')
    })

    it('evaluate filter should evaluate a liquid template', () => {
      Object.assign(formContext.relevantState, {
        WmHfSb: 'Enrique Chase'
      })

      const result = evaluateTemplate(
        '{{ "Hello, {{ WmHfSb }}!" | evaluate }}',
        formContext
      )

      expect(result).toBe('Hello, Enrique Chase!')
    })

    it('page filter should return the page definition', () => {
      // @ts-expect-error - spyOn type issue
      const filterSpy = jest.spyOn(engine.filters, 'page')
      const result = evaluateTemplate(
        '{%- assign startPageDef = "/start" | page -%}{{ startPageDef.title }}',
        formContext
      )

      expect(filterSpy).toHaveBeenCalledWith('/start')
      expect(result).toBe('Start page')
    })

    it('page filter should return empty when anything but a string is passed', () => {
      // @ts-expect-error - spyOn type issue
      const pageFilterSpy = jest.spyOn(engine.filters, 'page')

      let result = evaluateTemplate('{{ 0 | page }}', formContext)
      expect(pageFilterSpy).toHaveBeenLastCalledWith(0)
      expect(result).toBe('')

      result = evaluateTemplate('{{ undefined | page }}', formContext)
      expect(pageFilterSpy).toHaveBeenLastCalledWith(undefined)
      expect(result).toBe('')

      result = evaluateTemplate('{{ null | page }}', formContext)
      expect(result).toBe('')

      result = evaluateTemplate('{{ false | page }}', formContext)
      expect(pageFilterSpy).toHaveBeenLastCalledWith(false)
      expect(result).toBe('')

      result = evaluateTemplate('{{ [] | page }}', formContext)
      expect(result).toBe('')
    })

    it('href filter should return the page href', () => {
      // @ts-expect-error - spyOn type issue
      const filterSpy = jest.spyOn(engine.filters, 'href')
      const result = evaluateTemplate('{{ "/full-name" | href }}', formContext)

      expect(filterSpy).toHaveBeenCalledWith('/full-name')
      expect(result).toBe('/template/full-name')
    })

    it('href filter should return empty when no page passed', () => {
      // @ts-expect-error - spyOn type issue
      const pageFilterSpy = jest.spyOn(engine.filters, 'href')

      const result = evaluateTemplate('{{ undefined | href }}', formContext)
      expect(pageFilterSpy).toHaveBeenLastCalledWith(undefined)
      expect(result).toBe('')
    })

    it('field filter should return the component definition', () => {
      // @ts-expect-error - spyOn type issue
      const filterSpy = jest.spyOn(engine.filters, 'field')
      const result = evaluateTemplate(
        '{%- assign fullNameComponentDef = "WmHfSb" | field -%}{{ fullNameComponentDef.title }}',
        formContext
      )

      expect(filterSpy).toHaveBeenCalledWith('WmHfSb')
      expect(result).toBe('What&#39;s your full name?')
    })

    it('field filter should return empty when anything but a string is passed', () => {
      // @ts-expect-error - spyOn type issue
      const pageFilterSpy = jest.spyOn(engine.filters, 'field')

      let result = evaluateTemplate('{{ 0 | field }}', formContext)
      expect(pageFilterSpy).toHaveBeenLastCalledWith(0)
      expect(result).toBe('')

      result = evaluateTemplate('{{ undefined | field }}', formContext)
      expect(pageFilterSpy).toHaveBeenLastCalledWith(undefined)
      expect(result).toBe('')

      result = evaluateTemplate('{{ null | field }}', formContext)
      expect(result).toBe('')

      result = evaluateTemplate('{{ false | field }}', formContext)
      expect(pageFilterSpy).toHaveBeenLastCalledWith(false)
      expect(result).toBe('')

      result = evaluateTemplate('{{ [] | field }}', formContext)
      expect(result).toBe('')
    })

    it('answer filter should return the formatted submitted answer', () => {
      Object.assign(formContext.relevantState, {
        TKsWbP: true,
        WmHfSb: 'Enrique Chase'
      })

      // @ts-expect-error - spyOn type issue
      const filterSpy = jest.spyOn(engine.filters, 'answer')

      let result = evaluateTemplate("{{ 'TKsWbP' | answer }}", formContext)
      expect(filterSpy).toHaveBeenCalledWith('TKsWbP')
      expect(result).toBe('Yes')

      result = evaluateTemplate("{{ 'WmHfSb' | answer }}", formContext)
      expect(filterSpy).toHaveBeenCalledWith('WmHfSb')
      expect(result).toBe('Enrique Chase')
    })

    it('answer filter should return empty when anything but a string is passed', () => {
      // @ts-expect-error - spyOn type issue
      const pageFilterSpy = jest.spyOn(engine.filters, 'answer')

      let result = evaluateTemplate('{{ 0 | answer }}', formContext)
      expect(pageFilterSpy).toHaveBeenLastCalledWith(0)
      expect(result).toBe('')

      result = evaluateTemplate('{{ undefined | answer }}', formContext)
      expect(pageFilterSpy).toHaveBeenLastCalledWith(undefined)
      expect(result).toBe('')

      result = evaluateTemplate('{{ null | answer }}', formContext)
      expect(result).toBe('')

      result = evaluateTemplate('{{ false | answer }}', formContext)
      expect(pageFilterSpy).toHaveBeenLastCalledWith(false)
      expect(result).toBe('')

      result = evaluateTemplate('{{ [] | answer }}', formContext)
      expect(result).toBe('')
    })

    it('answer filter should return empty when non-form component name is passed', () => {
      // @ts-expect-error - spyOn type issue
      const pageFilterSpy = jest.spyOn(engine.filters, 'answer')

      const result = evaluateTemplate('{{ "FGyiLS" | answer }}', formContext)
      expect(pageFilterSpy).toHaveBeenLastCalledWith('FGyiLS')
      expect(result).toBe('')
    })
  })

  describe('Nunjucks filters', () => {
    describe('evaluate filter', () => {
      it('returns non-string values unchanged', () => {
        const mockContext: NunjucksContext = {
          context: {
            globals: {
              context: { pageMap: new Map() } as FormContext,
              pages: new Map(),
              components: new Map()
            }
          }
        }

        const numResult = (
          engine.filters.evaluate as unknown as EvaluateFilter
        ).call(mockContext, 123)
        expect(numResult).toBe(123)

        const objResult = (
          engine.filters.evaluate as unknown as EvaluateFilter
        ).call(mockContext, { foo: 'bar' })
        expect(objResult).toEqual({ foo: 'bar' })
      })
    })

    describe('href filter', () => {
      it('returns undefined when page is undefined', () => {
        const mockContext: NunjucksContext = {
          context: {
            globals: {
              context: { pageMap: new Map() } as FormContext,
              pages: new Map(),
              components: new Map()
            }
          }
        }

        const result = (engine.filters.href as unknown as HrefFilter).call(
          mockContext,
          '/some-page'
        )

        expect(result).toBeUndefined()
      })
    })
  })

  describe('handleLegacyRedirect', () => {
    let mockH: jest.Mocked<Pick<ResponseToolkit, 'redirect'>>
    let mockRedirectResponse: jest.Mocked<
      ReturnType<ResponseToolkit['redirect']>
    >

    beforeEach(() => {
      mockRedirectResponse = {
        permanent: jest.fn().mockReturnThis(),
        takeover: jest.fn().mockReturnThis()
      } as unknown as jest.Mocked<ReturnType<ResponseToolkit['redirect']>>

      mockH = {
        redirect: jest.fn().mockReturnValue(mockRedirectResponse)
      }
    })

    it('should call h.redirect with the target URL', () => {
      const targetUrl = '/another/target'
      handleLegacyRedirect(mockH as unknown as ResponseToolkit, targetUrl)

      expect(mockH.redirect).toHaveBeenCalledTimes(1)
      expect(mockH.redirect).toHaveBeenCalledWith(targetUrl)
    })

    it('should call permanent() and takeover() on the redirect response', () => {
      const targetUrl = '/final/destination'
      handleLegacyRedirect(mockH as unknown as ResponseToolkit, targetUrl)

      expect(mockRedirectResponse.permanent).toHaveBeenCalledTimes(1)
      expect(mockRedirectResponse.takeover).toHaveBeenCalledTimes(1)
    })

    it('should return the final response object from takeover()', () => {
      const targetUrl = '/the/end'
      const response = handleLegacyRedirect(
        mockH as unknown as ResponseToolkit,
        targetUrl
      )

      expect(response).toBe(mockRedirectResponse)
    })
  })

  describe('stripTimeFromDate', () => {
    it('should strip time', () => {
      expect(stripTimeFromDate(new Date(2000, 1, 1, 15, 12, 34))).toEqual(
        new Date(2000, 1, 1)
      )
      expect(stripTimeFromDate(new Date(2012, 11, 29, 1, 2, 3))).toEqual(
        new Date(2012, 11, 29)
      )
      expect(stripTimeFromDate(new Date(2012, 11, 29))).toEqual(
        new Date(2012, 11, 29)
      )
    })
  })
})
