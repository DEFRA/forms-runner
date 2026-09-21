import { SignInOutcome } from '~/src/server/auth/SignInOutcome.js'
import { signInEvent } from '~/src/server/auth/signInEvent.js'

describe('signInEvent', () => {
  it.each(Object.values(SignInOutcome))(
    'builds the event attributes for outcome %s',
    (outcome) => {
      expect(signInEvent('token-refresh', outcome, 'reason')).toEqual({
        event: {
          category: 'authentication',
          action: 'token-refresh',
          outcome,
          reason: 'reason'
        }
      })
    }
  )

  it.each(['', 'FAILURE', 'error', undefined])(
    'throws for an invalid outcome %p',
    (outcome) => {
      expect(() =>
        signInEvent(
          'token-refresh',
          /** @type {SignInOutcomeValue} */ (/** @type {unknown} */ (outcome)),
          'reason'
        )
      ).toThrow(TypeError)
    }
  )
})

/**
 * @import { SignInOutcomeValue } from '~/src/server/auth/SignInOutcome.js'
 */
