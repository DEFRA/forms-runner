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
 * Read the in-flight sign-in without consuming it, so a caller can check
 * `state` before deciding whether this callback is the one that should
 * consume it. There is one transaction slot per session, so a callback that
 * turns out not to match must leave it untouched for the genuine callback
 * to still find.
 * @param {Yar} yar
 * @returns {Transaction | null}
 */
export function getTransaction(yar) {
  return yar.get(TX_KEY) ?? null
}

/**
 * Consume the in-flight sign-in once it has been used, so one authorisation
 * code redemption corresponds to exactly one attempt.
 * @param {Yar} yar
 */
export function clearTransaction(yar) {
  yar.clear(TX_KEY)
}

/**
 * A throwaway origin to resolve candidate paths against, so isLocalPath can
 * compare the result's origin rather than pattern-match the input. The host
 * is on the reserved `.invalid` TLD, so it can never name a real service and
 * a redirect target that happened to match it could never be genuine.
 */
const LOCAL_ORIGIN = 'https://runner.invalid'

/**
 * True for a path that stays on this service. A leading slash rules out a
 * value that is relative to the current directory, and resolving the rest
 * against a fixed origin keeps only the values whose resolved origin is
 * unchanged — which is what a URL parser actually sends elsewhere despite a
 * single leading `/`, including a leading `\` and a tab or newline anywhere
 * in the string, all of which the parser normalises before resolving.
 * @param {string} [value]
 */
export function isLocalPath(value) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return false
  }

  try {
    return new URL(value, LOCAL_ORIGIN).origin === LOCAL_ORIGIN
  } catch {
    return false
  }
}

/**
 * @typedef {{ iss: string, sub: string, email: string, idToken: string }} Identity
 * @typedef {{ state: string, nonce: string, codeVerifier: string, returnTo: string }} Transaction
 */

/**
 * @import { Yar } from '@hapi/yar'
 */
