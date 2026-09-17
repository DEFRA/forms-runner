import { signInStrategy } from '~/src/server/resume/citizen-sign-in.js'
import { memorableWordStrategy } from '~/src/server/resume/memorable-word/index.js'

/**
 * Maps the record type the API reports onto the strategy that resumes it. The
 * API names the record and the runner names the journey, so the two sets of
 * names can change on their own. Partial rather than a total Record, because
 * the API's response is not validated against ResumeAuthType and can carry a
 * value this runner does not yet know.
 * @type {Partial<Record<ResumeAuthType, ResumeStrategy>>}
 */
const strategyByAuthType = {
  citizenSignIn: signInStrategy,
  memorableWord: memorableWordStrategy
}

/**
 * Used when the record names an authType this runner does not recognise. The
 * API's response is not validated against ResumeAuthType, so a value outside
 * the two known ones can reach here if the runner ships behind the API, and
 * this sends the citizen to the resume error page rather than the request
 * failing outright.
 * @type {ResumeStrategy}
 */
const unrecognisedAuthTypeStrategy = {
  start() {
    return Promise.resolve({ kind: 'error' })
  }
}

/**
 * @param {SaveAndExitDetails} details
 * @returns {ResumeStrategy}
 */
export function selectResumeStrategy({ authType }) {
  return strategyByAuthType[authType] ?? unrecognisedAuthTypeStrategy
}

/**
 * @import { ResumeAuthType, ResumeStrategy } from '~/src/server/resume/types.js'
 * @import { SaveAndExitDetails } from '~/src/server/types.js'
 */
