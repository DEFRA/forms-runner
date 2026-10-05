/**
 * The outcomes a sign-in step can log. These map to the ECS `event.outcome`
 * values that CDP indexes.
 */
export const SignInOutcome = Object.freeze(
  /** @type {const} */ ({
    Success: 'success',
    Failure: 'failure',
    Unknown: 'unknown'
  })
)

/**
 * @typedef {typeof SignInOutcome[keyof typeof SignInOutcome]} SignInOutcomeValue
 */
