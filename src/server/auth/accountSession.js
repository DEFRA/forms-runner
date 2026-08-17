import { config } from '~/src/config/index.js'

export const CITIZEN_KEY = 'citizen'
export const SIGN_IN_TRANSACTION_KEY = 'auth:signInTransaction'

/**
 * @param {Yar} yar
 * @param {Identity} identity
 */
export function setIdentity(yar, identity) {
  yar.set(CITIZEN_KEY, identity)
}

/**
 * @param {Yar} yar
 * @returns {Identity | null}
 */
export function getIdentity(yar) {
  return yar.get(CITIZEN_KEY) ?? null
}

/**
 * Stash the values the callback needs to finish the sign-in it did not start.
 * @param {Yar} yar
 * @param {SignInTransaction} transaction
 */
export function setSignInTransaction(yar, transaction) {
  yar.set(SIGN_IN_TRANSACTION_KEY, transaction)
}

/**
 * Read the in-flight sign-in and leave it in place, so a caller can check
 * `state` before deciding whether this callback is the one that should
 * consume it. There is one transaction slot per session, and leaving it
 * intact keeps it available to the genuine callback.
 * @param {Yar} yar
 * @returns {SignInTransaction | null}
 */
export function getSignInTransaction(yar) {
  return yar.get(SIGN_IN_TRANSACTION_KEY) ?? null
}

/**
 * Consume the in-flight sign-in once the callback has had its attempt at
 * completing it, so a repeat submission of the same callback finds nothing
 * to redeem and a retry starts from a fresh /auth/sign-in.
 * @param {Yar} yar
 */
export function clearSignInTransaction(yar) {
  yar.clear(SIGN_IN_TRANSACTION_KEY)
}

/**
 * This service's own origin, which a return target has to resolve to for the
 * citizen to still be inside this service. Read once, so a BASE_URL that is
 * not a URL stops the boot rather than quietly sending every sign-in home.
 */
const SERVICE_ORIGIN = new URL(config.get('baseUrl')).origin

/**
 * The local path (pathname and search) a candidate resolves to, for a value
 * that stays within this service; null for anything else. It returns the
 * parser's own result, so the stored value is already in the normalised form
 * an HTTP header will accept.
 *
 * The last check is on the result rather than the input, and it is the one
 * that matters. A dot segment resolves inside the origin, so `/.//host` keeps
 * this service's origin while resolving to the path `//host` — which a
 * browser reads as protocol-relative and follows to `host`. Judging the
 * resolved path is what catches that; judging the input cannot, because the
 * input holds a single leading slash and an origin that never changes.
 * @param {string} [value]
 * @returns {string | null}
 */
export function localReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return null
  }

  try {
    const url = new URL(value, SERVICE_ORIGIN)

    if (url.origin !== SERVICE_ORIGIN) {
      return null
    }

    const path = `${url.pathname}${url.search}`

    return path.startsWith('//') ? null : path
  } catch {
    return null
  }
}

/**
 * @typedef {{ iss: string, sub: string, email: string, idToken: string }} Identity
 * @typedef {{ state: string, nonce: string, codeVerifier: string, returnTo: string }} SignInTransaction
 */

/**
 * @import { Yar } from '@hapi/yar'
 */
