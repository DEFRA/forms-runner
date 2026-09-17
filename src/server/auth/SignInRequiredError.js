/**
 * The citizen must sign in again: their tokens have expired or been revoked,
 * or the session has none. The auth plugin turns this into a redirect to
 * sign in. When the provider session is still valid, the provider signs the
 * citizen back in without asking for a code.
 */
export class SignInRequiredError extends Error {
  /**
   * @param {string} reason - a fixed string, never a token value
   */
  constructor(reason) {
    super(`Sign in required: ${reason}`)
    this.name = 'SignInRequiredError'
  }
}
