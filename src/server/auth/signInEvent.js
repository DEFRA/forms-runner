/**
 * Log attributes for a sign-in step. CDP indexes the `event` object, so these
 * are searchable. Values are fixed strings; nothing from the provider or the
 * session is logged.
 * @param {string} action
 * @param {string} outcome - `success`, `failure` or `unknown`
 * @param {string} reason
 */
export function signInEvent(action, outcome, reason) {
  return {
    event: {
      category: 'authentication',
      action,
      outcome,
      reason
    }
  }
}
