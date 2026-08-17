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
 * The candidate resolved against this service's origin, for a value that
 * lands back inside it; null for anything else. A leading slash keeps the
 * value absolute within the service, and the origin comparison is what
 * decides the rest, so a value a URL parser sends elsewhere despite its
 * single leading `/` — a leading `\`, or a stray tab or newline the parser
 * strips first — is judged on where it lands.
 * @param {string} [value]
 * @returns {URL | null}
 */
function parseLocalPath(value) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return null
  }

  try {
    const url = new URL(value, SERVICE_ORIGIN)
    return url.origin === SERVICE_ORIGIN ? url : null
  } catch {
    return null
  }
}

/**
 * The local path (pathname and search) a candidate resolves to, for a value
 * that stays within this service; null for anything else. It returns the
 * parser's own result, so the stored value is already in the normalised form
 * an HTTP header will accept.
 * @param {string} [value]
 * @returns {string | null}
 */
export function localReturnPath(value) {
  const url = parseLocalPath(value)
  return url ? `${url.pathname}${url.search}` : null
}

/**
 * @typedef {{ iss: string, sub: string, email: string, idToken: string }} Identity
 * @typedef {{ state: string, nonce: string, codeVerifier: string, returnTo: string }} SignInTransaction
 */

/**
 * @import { Yar } from '@hapi/yar'
 */
