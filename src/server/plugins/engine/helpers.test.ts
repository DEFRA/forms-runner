import { type ResponseToolkit } from '@hapi/hapi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  checkFormStatus,
  encodeUrl,
  proceed,
  redirectTo,
  redirectUrl,
  type RequestWithQuery
} from '~/src/server/plugins/engine/helpers.js'

describe('Helpers', () => {
  let request: Pick<RequestWithQuery, 'query'>
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
        state: 'live',
        isPreview: true
      })
    })

    it('should return false for paths not starting with PREVIEW_PATH_PREFIX', () => {
      const path = '/some/other/path'
      expect(checkFormStatus(path)).toStrictEqual({
        state: 'live',
        isPreview: false
      })
    })

    it('should be case insensitive and return draft when form is draft', () => {
      const path = `${PREVIEW_PATH_PREFIX.toUpperCase()}/draft/path`
      expect(checkFormStatus(path)).toStrictEqual({
        state: 'draft',
        isPreview: true
      })
    })

    it('throws an error for invalid form state', () => {
      const path = `${PREVIEW_PATH_PREFIX}/invalid-state`
      expect(() => checkFormStatus(path)).toThrow(
        'Invalid form state: invalid-state'
      )
    })
  })
})
