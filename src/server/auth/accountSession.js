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
 * Read the in-flight sign in without clearing it, so a caller can check
 * `state` first. There is one transaction per session, so a callback that
 * does not match must leave it for the one that does.
 * @param {Yar} yar
 * @returns {SignInTransaction | null}
 */
export function getSignInTransaction(yar) {
  return yar.get(SIGN_IN_TRANSACTION_KEY) ?? null
}

/**
 * Clear the transaction once the callback has used it. A repeat of the same
 * callback then finds nothing, and a retry starts at /auth/sign-in.
 * @param {Yar} yar
 */
export function clearSignInTransaction(yar) {
  yar.clear(SIGN_IN_TRANSACTION_KEY)
}

/**
 * @typedef {{ iss: string, sub: string, email: string, idToken: string }} Identity
 * @typedef {{ state: string, nonce: string, codeVerifier: string, returnUrl: string }} SignInTransaction
 */

/**
 * @import { Yar } from '@hapi/yar'
 */
