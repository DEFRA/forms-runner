import { SignInOutcome } from '~/src/server/auth/SignInOutcome.js'

const OUTCOMES = new Set(Object.values(SignInOutcome))

/**
 * Log attributes for a sign-in step. CDP indexes the `event` object, so these
 * are searchable. Values are fixed strings; nothing from the provider or the
 * session is logged.
 * @param {string} action
 * @param {SignInOutcomeValue} outcome
 * @param {string} reason
 */
export function signInEvent(action, outcome, reason) {
  if (!OUTCOMES.has(outcome)) {
    throw new TypeError(`Invalid sign-in event outcome: ${outcome}`)
  }

  return {
    event: {
      category: 'authentication',
      action,
      outcome,
      reason
    }
  }
}

/**
 * @import { SignInOutcomeValue } from '~/src/server/auth/SignInOutcome.js'
 */
