export const CITIZEN_KEY = 'citizen'
export const TX_KEY = 'oidc:tx'
export const SIGNED_OUT_FROM_KEY = 'auth:signedOutFrom'

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
 * @param {Yar} yar
 */
export function clearIdentity(yar) {
  yar.clear(CITIZEN_KEY)
}

/**
 * Stash the values the callback needs to finish the sign-in it did not start.
 * @param {Yar} yar
 * @param {Transaction} transaction
 */
export function setTransaction(yar, transaction) {
  yar.set(TX_KEY, transaction)
}

/**
 * Read the in-flight sign-in and clear it, so one authorisation code redemption
 * corresponds to exactly one attempt. `get`'s second argument is yar's own
 * read-and-clear.
 * @param {Yar} yar
 * @returns {Transaction | null}
 */
export function takeTransaction(yar) {
  return yar.get(TX_KEY, true) ?? null
}

/**
 * True for a path that stays on this service. A single leading slash is the
 * whole test: `//host` is protocol-relative and leaves, and anything without a
 * leading slash is either absolute or resolved against the current directory.
 * @param {string} [value]
 */
export function isLocalPath(value) {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//')
  )
}

/**
 * @typedef {{ iss: string, sub: string, email: string, idToken: string }} Identity
 * @typedef {{ state: string, nonce: string, codeVerifier: string, returnTo: string }} Transaction
 */

/**
 * @import { Yar } from '@hapi/yar'
 */
