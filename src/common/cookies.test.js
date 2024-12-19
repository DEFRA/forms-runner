import { parseCookieConsent } from '~/src/common/cookies.js'

describe('cookies', () => {
  it('parses a valid policy', () => {
    expect(parseCookieConsent('{"analytics":true}')).toEqual({
      analytics: true
    })
  })

  it.each([
    "['not', 'an', 'object']",
    '{{ not: "an object" }}',
    '{ additional: AAA }',
    '{ marketing: 100 }',
    '',
    'null'
  ])('converts a malformed policy to the default', (value) => {
    expect(parseCookieConsent(value)).toEqual({
      analytics: null,
      dismissed: false
    })
  })
})
