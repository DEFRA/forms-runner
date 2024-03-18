import {
  proceed,
  redirectTo,
  redirectUrl,
  nonRelativeRedirectUrl,
  getValidStateFromQueryParameters
} from '../../../../../src/server/plugins/engine/helpers'
import Joi from 'joi'

describe('Helpers', () => {
  describe('proceed', () => {
    let h
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

      expect(h.redirect.mock.calls).toHaveLength(1)
      expect(h.redirect.mock.calls[0]).toEqual(
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

      expect(h.redirect.mock.calls).toHaveLength(1)
      expect(h.redirect.mock.calls[0]).toEqual(
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

      expect(h.redirect.mock.calls).toHaveLength(1)
      expect(h.redirect.mock.calls[0]).toEqual(
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

      expect(h.redirect.mock.calls).toHaveLength(1)
      expect(h.redirect.mock.calls[0]).toEqual(
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

      expect(h.redirect.mock.calls).toHaveLength(1)
      expect(h.redirect.mock.calls[0]).toEqual(
        expect.arrayContaining([nextUrl])
      )
      expect(returned).toEqual(returnValue)
    })
  })

  describe('redirectTo', () => {
    let h
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

      expect(h.redirect.mock.calls).toHaveLength(1)
      expect(h.redirect.mock.calls[0]).toEqual(
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

      expect(h.redirect.mock.calls).toHaveLength(1)
      expect(h.redirect.mock.calls[0]).toEqual(
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

      expect(h.redirect.mock.calls).toHaveLength(1)
      expect(h.redirect.mock.calls[0]).toEqual(
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

      expect(h.redirect.mock.calls).toHaveLength(1)
      expect(h.redirect.mock.calls[0]).toEqual(
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

      expect(h.redirect.mock.calls).toHaveLength(1)
      expect(h.redirect.mock.calls[0]).toEqual(
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

      expect(h.redirect.mock.calls).toHaveLength(1)
      expect(h.redirect.mock.calls[0]).toEqual(
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

      expect(h.redirect.mock.calls).toHaveLength(1)
      expect(h.redirect.mock.calls[0]).toEqual(
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

  describe('nonRelativeRedirectUrl', () => {
    test('Should return non-relative url with correct query parameters', () => {
      const request = {
        query: {
          visit: '123',
          f_t: 'true',
          ignored: true
        }
      }
      const nextUrl = 'https://test.com'
      const url = nonRelativeRedirectUrl(request, nextUrl)
      expect(url).toBe('https://test.com/?f_t=true')
    })
  })

  describe('getValidStateFromQueryParameters', () => {
    test('Should return an empty object if none of the query parameters relate to valid fields for pre-population', () => {
      const query = {
        aBadQueryParam: 'A value'
      }
      const prePopFields = {
        eggType: Joi.string().required()
      }
      expect(
        Object.keys(getValidStateFromQueryParameters(prePopFields, query))
      ).toHaveLength(0)
    })

    test('Should return an empty object when a query parameter is valid, but a value already exists in the form state', () => {
      const query = {
        aBadQueryParam: 'A value',
        eggType: 'Hard boiled'
      }
      const prePopFields = {
        eggType: Joi.string().required()
      }
      const state = {
        eggType: 'Fried'
      }

      expect(
        Object.keys(
          getValidStateFromQueryParameters(prePopFields, query, state)
        )
      ).toHaveLength(0)
    })

    test('Should be able to update nested object values', () => {
      const query = {
        'yourEggs.eggType': 'Fried egg'
      }
      const prePopFields = {
        yourEggs: {
          eggType: Joi.string().required()
        }
      }
      expect(
        getValidStateFromQueryParameters(prePopFields, query).yourEggs.eggType
      ).toBe('Fried egg')
    })

    test('Should reject a value if it fails validation', () => {
      const query = {
        'yourEggs.eggType': 'deviled'
      }
      const prePopFields = {
        yourEggs: {
          eggType: Joi.string().valid('boiled', 'fried', 'poached')
        }
      }
      expect(
        Object.keys(getValidStateFromQueryParameters(prePopFields, query))
      ).toHaveLength(0)
    })
  })
})
