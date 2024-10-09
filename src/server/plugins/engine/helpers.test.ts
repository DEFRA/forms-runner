import { type ResponseToolkit } from '@hapi/hapi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  encodeUrl,
  hasPreviewPath,
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
      redirectTo(request, h, nextUrl)

      expect(h.redirect).toHaveBeenCalledTimes(1)
      expect(h.redirect).toHaveBeenCalledWith(nextUrl)
    })

    it('should redirect to next url ignoring most params from original request', () => {
      request.query.myParam = 'myValue'
      request.query.myParam2 = 'myValue2'

      const nextUrl = 'badgers/monkeys'
      redirectTo(request, h, nextUrl)

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
      const returned = redirectUrl(request, nextUrl)

      expect(returned).toEqual(nextUrl)
    })

    it('should return target url ignoring most params from original request', () => {
      request.query.myParam = 'myValue'
      request.query.myParam2 = 'myValue2'

      const nextUrl = 'badgers/monkeys'
      const returned = redirectUrl(request, nextUrl)

      expect(returned).toEqual(nextUrl)
    })

    it('should set params from params object', () => {
      const nextUrl = 'badgers/monkeys'

      const returned = redirectUrl(request, nextUrl, {
        returnUrl: '/myreturnurl',
        badger: 'monkeys'
      })

      expect(returned).toBe(
        `${nextUrl}?returnUrl=%2Fmyreturnurl&badger=monkeys`
      )
    })
  })

  describe('hasPreviewPath', () => {
    it('should return true for paths starting with PREVIEW_PATH_PREFIX', () => {
      const path = `${PREVIEW_PATH_PREFIX}/some/path`
      expect(hasPreviewPath(path)).toBe(true)
    })

    it('should return false for paths not starting with PREVIEW_PATH_PREFIX', () => {
      const path = '/some/other/path'
      expect(hasPreviewPath(path)).toBe(false)
    })

    it('should be case insensitive', () => {
      const path = `${PREVIEW_PATH_PREFIX.toUpperCase()}/some/path`
      expect(hasPreviewPath(path)).toBe(true)
    })
  })
})
