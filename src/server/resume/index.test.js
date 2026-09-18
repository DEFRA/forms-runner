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

  it('falls back to an error outcome for an authType neither strategy recognises', async () => {
    // The submission api's response is not validated against ResumeAuthType,
    // so an authType outside the two known values reaches here as real
    // runtime data rather than something the type system rules out.
    const unrecognisedAuthType = /** @type {ResumeAuthType} */ (
      /** @type {unknown} */ ('somethingNew')
    )

    const strategy = selectResumeStrategy(details(unrecognisedAuthType))

    const request = /** @type {Request} */ (/** @type {unknown} */ ({}))
    const context = /** @type {ResumeContext} */ (/** @type {unknown} */ ({}))

    await expect(strategy(request, context)).resolves.toEqual({
      kind: 'error'
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { ResumeAuthType, ResumeContext } from '~/src/server/resume/types.js'
 * @import { SaveAndExitDetails } from '~/src/server/types.js'
 */
