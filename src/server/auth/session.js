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
 * The candidate resolved against the local origin, or null if it would leave
 * the service. A leading slash rules out a value that is relative to the
 * current directory, and resolving the rest against a fixed origin keeps
 * only the values whose resolved origin is unchanged. A URL parser can send
 * a value elsewhere despite its single leading `/` — a leading `\` is one
 * way — and it also strips a stray tab or newline before resolving, so a
 * value carrying one is rejected only when that stripping is what moves it
 * off-origin, not simply for containing the character.
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
    const url = new URL(value, LOCAL_ORIGIN)
    return url.origin === LOCAL_ORIGIN ? url : null
  } catch {
    return null
  }
}

/**
 * True for a path that stays on this service.
 * @param {string} [value]
 */
export function isLocalPath(value) {
  return parseLocalPath(value) !== null
}

/**
 * The local path (pathname and search) a candidate resolves to, or null if
 * it would leave the service. Returns the parser's own result rather than
 * the input string, so storing and redirecting to it lands on the
 * destination a URL parser already resolved it to — not a raw value a
 * parser normalises on the way through, which some consumers of it, an
 * HTTP header for one, would reject outright rather than normalise.
 * @param {string} [value]
 * @returns {string | null}
 */
export function localReturnPath(value) {
  const url = parseLocalPath(value)
  return url ? `${url.pathname}${url.search}` : null
}

/**
 * @typedef {{ iss: string, sub: string, email: string, idToken: string }} Identity
 * @typedef {{ state: string, nonce: string, codeVerifier: string, returnTo: string }} Transaction
 */

/**
 * @import { Yar } from '@hapi/yar'
 */
