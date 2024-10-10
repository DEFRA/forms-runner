import { type ResponseToolkit } from '@hapi/hapi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  hasPreviewPath,
  proceed,
  redirectTo,
  redirectUrl
} from '~/src/server/plugins/engine/helpers.js'

describe('Helpers', () => {
  describe('proceed', () => {
    let h: Pick<ResponseToolkit, 'redirect'>
    const returnValue = ''
    beforeEach(() => {
      h = {
        redirect: jest.fn().mockReturnValue(returnValue)
      }
    })

    test('Should redirect to the returnUrl if one is provided', () => {
      const returnUrl = '/my-return-url'
      const request = {
        query: {
          returnUrl
        }
      }
      const nextUrl = 'badgers/monkeys'
      const returned = proceed(request, h, nextUrl)

      expect(jest.mocked(h.redirect).mock.calls).toHaveLength(1)
      expect(jest.mocked(h.redirect).mock.calls[0]).toEqual(
        expect.arrayContaining([returnUrl])
      )
      expect(returned).toEqual(returnValue)
    })

    test('Should redirect to next url when no query params', () => {
      const request = {
        query: {}
      }
      const nextUrl = 'badgers/monkeys'
      const returned = proceed(request, h, nextUrl)

      expect(jest.mocked(h.redirect).mock.calls).toHaveLength(1)
      expect(jest.mocked(h.redirect).mock.calls[0]).toEqual(
        expect.arrayContaining([nextUrl])
      )
      expect(returned).toEqual(returnValue)
    })

    test('Should redirect to next url ignoring most params from original request', () => {
      const request = {
        query: {
          myParam: 'myValue',
          myParam2: 'myValue2'
        }
      }
      const nextUrl = 'badgers/monkeys'
      const returned = proceed(request, h, nextUrl)

      expect(jest.mocked(h.redirect).mock.calls).toHaveLength(1)
      expect(jest.mocked(h.redirect).mock.calls[0]).toEqual(
        expect.arrayContaining([nextUrl])
      )
      expect(returned).toEqual(returnValue)
    })
  })

  describe('redirectTo', () => {
    let h: Pick<ResponseToolkit, 'redirect'>
    const returnValue = ''
    beforeEach(() => {
      h = {
        redirect: jest.fn().mockReturnValue(returnValue)
      }
    })

    test('Should redirect to next url when no query params in the request', () => {
      const request = {
        query: {}
      }
      const nextUrl = 'badgers/monkeys'
      const returned = redirectTo(request, h, nextUrl)

      expect(jest.mocked(h.redirect).mock.calls).toHaveLength(1)
      expect(jest.mocked(h.redirect).mock.calls[0]).toEqual(
        expect.arrayContaining([nextUrl])
      )
      expect(returned).toEqual(returnValue)
    })

    test('Should redirect to next url ignoring most params from original request', () => {
      const request = {
        query: {
          myParam: 'myValue',
          myParam2: 'myValue2'
        }
      }
      const nextUrl = 'badgers/monkeys'
      const returned = redirectTo(request, h, nextUrl)

      expect(jest.mocked(h.redirect).mock.calls).toHaveLength(1)
      expect(jest.mocked(h.redirect).mock.calls[0]).toEqual(
        expect.arrayContaining([nextUrl])
      )
      expect(returned).toEqual(returnValue)
    })
  })

  describe('redirectUrl', () => {
    test('Should return target url when no query params in the request', () => {
      const request = {
        query: {}
      }
      const nextUrl = 'badgers/monkeys'
      const returned = redirectUrl(request, nextUrl)

      expect(returned).toEqual(nextUrl)
    })

    test('Should return target url ignoring most params from original request', () => {
      const request = {
        query: {
          myParam: 'myValue',
          myParam2: 'myValue2'
        }
      }
      const nextUrl = 'badgers/monkeys'
      const returned = redirectUrl(request, nextUrl)

      expect(returned).toEqual(nextUrl)
    })

    test('Should set params from params object', () => {
      const request = {
        query: {}
      }
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
    it('Should return true for paths starting with PREVIEW_PATH_PREFIX', () => {
      const path = `${PREVIEW_PATH_PREFIX}/some/path`
      expect(hasPreviewPath(path)).toBe(true)
    })

    it('Should return false for paths not starting with PREVIEW_PATH_PREFIX', () => {
      const path = '/some/other/path'
      expect(hasPreviewPath(path)).toBe(false)
    })

    it('Should be case insensitive', () => {
      const path = `${PREVIEW_PATH_PREFIX.toUpperCase()}/some/path`
      expect(hasPreviewPath(path)).toBe(true)
    })
  })
})
