import { signInStrategy } from '~/src/server/resume/citizen-sign-in.js'
import { memorableWordStrategy } from '~/src/server/resume/memorable-word/index.js'

/**
 * Maps the record type the API reports onto the strategy that resumes it. The
 * API names the record and the runner names the journey, so the two sets of
 * names can change on their own.
 * @type {Record<ResumeAuthType, ResumeStrategy>}
 */
const strategyByAuthType = {
  citizenSignIn: signInStrategy,
  memorableWord: memorableWordStrategy
}

/**
 * @param {SaveAndExitDetails} details
 * @returns {ResumeStrategy}
 */
export function selectResumeStrategy({ authType }) {
  return strategyByAuthType[authType]
}

/**
 * @import { ResumeAuthType, ResumeStrategy } from '~/src/server/resume/types.js'
 * @import { SaveAndExitDetails } from '~/src/server/types.js'
 */
