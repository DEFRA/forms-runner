import { type ResponseToolkit } from '@hapi/hapi'
import Joi from 'joi'

import {
  proceed,
  redirectTo,
  redirectUrl,
  getValidStateFromQueryParameters
} from '~/src/server/plugins/engine/helpers.js'

describe('Helpers', () => {
  describe('proceed', () => {
    let h: ResponseToolkit
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
  })

  describe('redirectTo', () => {
    let h: ResponseToolkit
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
