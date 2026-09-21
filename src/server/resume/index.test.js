import { resumeCitizenSignIn } from '~/src/server/resume/citizen-sign-in.js'
import { selectResume } from '~/src/server/resume/index.js'
import { resumeMemorableWord } from '~/src/server/resume/memorable-word/index.js'
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

describe('selectResume', () => {
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

  it('picks the citizen sign-in resume for an account record', () => {
    expect(selectResume(details('citizenSignIn'))).toBe(resumeCitizenSignIn)
  })

  it('picks the memorable word resume for a memorable word record', () => {
    expect(selectResume(details('memorableWord'))).toBe(resumeMemorableWord)
  })

  it('falls back to an error outcome for an unknown authType', async () => {
    // The submission api's response is not validated against ResumeAuthType,
    // so an authType outside the two known values reaches here as real
    // runtime data rather than something the type system rules out.
    const unrecognisedAuthType = /** @type {ResumeAuthType} */ (
      /** @type {unknown} */ ('somethingNew')
    )

    const resume = selectResume(details(unrecognisedAuthType))

    const request = /** @type {Request} */ (/** @type {unknown} */ ({}))
    const context = /** @type {ResumeContext} */ (/** @type {unknown} */ ({}))

    await expect(resume(request, context)).resolves.toEqual({
      kind: 'error'
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { ResumeAuthType, ResumeContext } from '~/src/server/resume/types.js'
 * @import { SaveAndExitDetails } from '~/src/server/types.js'
 */
