/**
 * The citizen must sign in again: the provider refused their refresh token,
 * or named a different citizen in the refreshed ID token. The
 * citizen-session scheme then treats the request as signed out.
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
