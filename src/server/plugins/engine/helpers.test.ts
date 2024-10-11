import { type ResponseToolkit } from '@hapi/hapi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  checkFormStatus,
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

    test('Should copy feedback param from the original request', () => {
      const request = {
        query: {
          f_t: 'myValue'
        }
      }
      const nextUrl = 'badgers/monkeys'
      const returned = proceed(request, h, nextUrl)

      expect(jest.mocked(h.redirect).mock.calls).toHaveLength(1)
      expect(jest.mocked(h.redirect).mock.calls[0]).toEqual(
        expect.arrayContaining([`${nextUrl}?f_t=myValue`])
      )
      expect(returned).toEqual(returnValue)
    })

    test('Should use params provided in nextUrl in preference to those in the original request', () => {
      const request = {
        query: {
          f_t: 'myValue'
        }
      }
      const nextUrl = 'badgers/monkeys?f_t=newValue'
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

    test('Should copy feedback param from the original request', () => {
      const request = {
        query: {
          f_t: 'myValue'
        }
      }
      const nextUrl = 'badgers/monkeys'
      const returned = redirectTo(request, h, nextUrl)

      expect(jest.mocked(h.redirect).mock.calls).toHaveLength(1)
      expect(jest.mocked(h.redirect).mock.calls[0]).toEqual(
        expect.arrayContaining([`${nextUrl}?f_t=myValue`])
      )
      expect(returned).toEqual(returnValue)
    })

    test('Should use params provided in nextUrl in preference to those in the original request', () => {
      const request = {
        query: {
          f_t: 'myValue'
        }
      }
      const nextUrl = 'badgers/monkeys?f_t=newValue'
      const returned = redirectTo(request, h, nextUrl)

      expect(jest.mocked(h.redirect).mock.calls).toHaveLength(1)
      expect(jest.mocked(h.redirect).mock.calls[0]).toEqual(
        expect.arrayContaining([nextUrl])
      )
      expect(returned).toEqual(returnValue)
    })

    test('Should set params from params object', () => {
      const request = {
        query: {
          f_t: 'myValue'
        }
      }
      const nextUrl = 'badgers/monkeys'
      const returned = redirectTo(request, h, nextUrl, {
        returnUrl: '/myreturnurl',
        badger: 'monkeys'
      })

      expect(jest.mocked(h.redirect).mock.calls).toHaveLength(1)
      expect(jest.mocked(h.redirect).mock.calls[0]).toEqual(
        expect.arrayContaining([
          `${nextUrl}?returnUrl=%2Fmyreturnurl&badger=monkeys&f_t=myValue`
        ])
      )
      expect(returned).toEqual(returnValue)
    })

    test('Should use params provided in params object in preference to those in the original request', () => {
      const request = {
        query: {
          f_t: 'myValue'
        }
      }
      const nextUrl = 'badgers/monkeys'
      const returned = redirectTo(request, h, nextUrl, { f_t: 'newValue' })

      expect(jest.mocked(h.redirect).mock.calls).toHaveLength(1)
      expect(jest.mocked(h.redirect).mock.calls[0]).toEqual(
        expect.arrayContaining([`${nextUrl}?f_t=newValue`])
      )
      expect(returned).toEqual(returnValue)
    })

    test('Should redirect to absolute url as provided without any adulteration', () => {
      const request = {
        query: {
          f_t: 'myValue'
        }
      }
      const nextUrl = 'http://www.example.com/monkeys'
      const returned = redirectTo(request, h, nextUrl, { f_t: 'newValue' })

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

    test('Should copy feedback param from the original request', () => {
      const request = {
        query: {
          f_t: 'myValue'
        }
      }
      const nextUrl = 'badgers/monkeys'
      const returned = redirectUrl(request, nextUrl)

      expect(returned).toBe(`${nextUrl}?f_t=myValue`)
    })

    test('Should use params provided in nextUrl in preference to those in the original request', () => {
      const request = {
        query: {
          f_t: 'myValue'
        }
      }
      const nextUrl = 'badgers/monkeys?f_t=newValue'
      const returned = redirectUrl(request, nextUrl)

      expect(returned).toEqual(nextUrl)
    })

    test('Should set params from params object', () => {
      const request = {
        query: {
          f_t: 'myValue'
        }
      }
      const nextUrl = 'badgers/monkeys'
      const returned = redirectUrl(request, nextUrl, {
        returnUrl: '/myreturnurl',
        badger: 'monkeys'
      })

      expect(returned).toBe(
        `${nextUrl}?returnUrl=%2Fmyreturnurl&badger=monkeys&f_t=myValue`
      )
    })

    test('Should use params provided in params object in preference to those in the original request', () => {
      const request = {
        query: {
          f_t: 'myValue'
        }
      }
      const nextUrl = 'badgers/monkeys'
      const returned = redirectUrl(request, nextUrl, { f_t: 'newValue' })
      expect(returned).toBe(`${nextUrl}?f_t=newValue`)
    })
  })

  describe('hasPreviewPath', () => {
    it('Should return true/live for paths starting with PREVIEW_PATH_PREFIX and form is live', () => {
      const path = `${PREVIEW_PATH_PREFIX}/live/another/segment`
      expect(checkFormStatus(path)).toStrictEqual({
        isDraftOrLive: 'live',
        isPreview: true
      })
    })

    it('Should return false for paths not starting with PREVIEW_PATH_PREFIX', () => {
      const path = '/some/other/path'
      const result = checkFormStatus(path)
      expect(result.isPreview).toBe(false)
      expect(result.isDraftOrLive).toBeUndefined()
    })

    it('Should be case insensitive and return draft when form is draft', () => {
      const path = `${PREVIEW_PATH_PREFIX.toUpperCase()}/draft/path`
      expect(checkFormStatus(path)).toStrictEqual({
        isDraftOrLive: 'draft',
        isPreview: true
      })
    })
  })
})
