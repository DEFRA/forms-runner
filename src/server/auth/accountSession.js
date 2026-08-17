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
 * What the session holds about a signed-in citizen. The callback is the one
 * point where the provider supplies these, so each field is kept there or not
 * at all.
 * @typedef {object} Identity
 * @property {string} iss - names the provider that authenticated the citizen.
 *   A citizen is identified by `iss` and `sub` together, because `sub` is
 *   unique only within one provider. Save and exit writes the pair with a
 *   saved form, so the citizen who signs in again gets their own back.
 * @property {string} sub - the citizen's identifier at that provider. Stable
 *   across sign ins, unlike the email address, which the citizen can change.
 * @property {string} email - names the citizen in the header on every page.
 * @property {string} idToken - the provider asks for this to sign the citizen
 *   out of the provider as well as out of this service.
 */

/**
 * What a sign in that has started, and not yet finished, holds. The callback
 * arrives as a separate request, so these live in the session between the two.
 * @typedef {object} SignInTransaction
 * @property {string} state - the callback carries this back. It matches when
 *   the callback belongs to the sign in this session started.
 * @property {string} nonce - ties the ID token to this sign in, so a token
 *   issued for another one is refused.
 * @property {string} codeVerifier - the PKCE secret. The token request sends
 *   it to show it comes from the client that started the sign in.
 * @property {string} returnUrl - where the callback sends the citizen once
 *   they are signed in.
 */

/**
 * @import { Yar } from '@hapi/yar'
 */
