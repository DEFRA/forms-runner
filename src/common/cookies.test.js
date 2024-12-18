import { parseCookieConsent } from '~/src/common/cookies.js'

describe('cookies', () => {
  it('parses a valid policy', () => {
    expect(parseCookieConsent('{"analytics":true}')).toEqual({
      analytics: true
    })
  })

  it('converts a malformed policy to the default', () => {
    expect(parseCookieConsent('{{{')).toEqual({
      analytics: null,
      dismissed: false
    })
  })

  it('converts an invalid policy to the default', () => {
    expect(parseCookieConsent('{unknown:false}')).toEqual({
      analytics: null,
      dismissed: false
    })
  })
})
