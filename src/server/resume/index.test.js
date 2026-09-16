import { signInStrategy } from '~/src/server/resume/citizen-sign-in.js'
import { selectResumeStrategy } from '~/src/server/resume/index.js'
import { memorableWordStrategy } from '~/src/server/resume/memorable-word/index.js'
import { resumeFormPath } from '~/src/server/utils/utils.js'

describe('resumeFormPath', () => {
  it('builds the path that resumes a saved form', () => {
    expect(
      resumeFormPath(
        'eab6ac6c-79b6-439f-bd94-d93eb121b3f1',
        'fd4e6453-fb32-43e4-b4cf-12b381a713de'
      )
    ).toBe(
      '/resume-form/eab6ac6c-79b6-439f-bd94-d93eb121b3f1/fd4e6453-fb32-43e4-b4cf-12b381a713de'
    )
  })
})

describe('selectResumeStrategy', () => {
  /**
   * The selector reads `authType` alone, so the mock carries only that and is
   * cast through `unknown` rather than built in full.
   * @param {ResumeAuthType} authType
   * @returns {SaveAndExitDetails}
   */
  function details(authType) {
    return /** @type {SaveAndExitDetails} */ (
      /** @type {unknown} */ ({ authType })
    )
  }

  it('picks the sign-in strategy for an account record', () => {
    expect(selectResumeStrategy(details('citizenSignIn'))).toBe(signInStrategy)
  })

  it('picks the memorable word strategy for a memorable word record', () => {
    expect(selectResumeStrategy(details('memorableWord'))).toBe(
      memorableWordStrategy
    )
  })
})

/**
 * @import { ResumeAuthType } from '~/src/server/resume/types.js'
 * @import { SaveAndExitDetails } from '~/src/server/types.js'
 */
