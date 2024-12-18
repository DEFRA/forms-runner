/**
  @type {CookieConsent}
 */
export const defaultConsent = {
  analytics: null,
  dismissed: false
}

/**
 * Parses the cookie consent policy
 * @param {string} value
 */
export function parseCookieConsent(value) {
  /** @type {CookieConsent} */
  let cookieConsent

  try {
    const encodedValue = decodeURIComponent(value)

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const decodedValue = JSON.parse(encodedValue)

    if (isValidConsent(decodedValue)) {
      cookieConsent = decodedValue
    } else {
      cookieConsent = defaultConsent
    }
  } catch {
    cookieConsent = defaultConsent
  }

  return cookieConsent
}

/**
 * Serialises the cookie consent policy
 * @param {CookieConsent} consent
 * @returns {string} cookie value
 */
export function serialiseCookieConsent(consent) {
  return encodeURIComponent(JSON.stringify(consent))
}

/**
 * @param {unknown} consent
 * @returns {consent is CookieConsent}
 */
function isValidConsent(consent) {
  if (consent === null || Array.isArray(consent)) {
    return false
  }

  return typeof consent === 'object' && 'analytics' in consent
}

/**
 * @import {CookieConsent} from '~/src/common/types.js'
 */
