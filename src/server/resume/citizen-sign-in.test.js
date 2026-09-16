import { signInStrategy } from '~/src/server/resume/citizen-sign-in.js'
import { getSavedFormState } from '~/src/server/services/submissionService.js'

jest.mock('~/src/server/services/submissionService.js')

describe('signInStrategy', () => {
  const context = /** @type {ResumeContext} */ (
    /** @type {unknown} */ ({
      form: { slug: 'my-form-to-resume' },
      details: { authType: 'citizenSignIn' },
      formId: 'eab6ac6c-79b6-439f-bd94-d93eb121b3f1',
      magicLinkId: 'fd4e6453-fb32-43e4-b4cf-12b381a713de',
      slugAndState: ''
    })
  )

  /**
   * The mock carries only the fields this strategy reads, so it is cast
   * through `unknown` rather than built in full.
   * @param {object} auth
   * @param {string} path
   * @returns {Request}
   */
  function signedInRequest(auth, path = '/resume-form/form-1/link-1') {
    return /** @type {Request} */ (/** @type {unknown} */ ({ path, auth }))
  }

  it('sends a signed-out citizen to sign in, and back again afterwards', async () => {
    const request = signedInRequest(
      { isAuthenticated: false },
      '/resume-form/eab6ac6c-79b6-439f-bd94-d93eb121b3f1/fd4e6453-fb32-43e4-b4cf-12b381a713de'
    )

    await expect(signInStrategy.start(request, context)).resolves.toEqual({
      kind: 'redirect',
      location:
        '/auth/sign-in?returnUrl=%2Fresume-form%2Feab6ac6c-79b6-439f-bd94-d93eb121b3f1%2Ffd4e6453-fb32-43e4-b4cf-12b381a713de'
    })
  })

  it('returns the saved answers to the citizen who owns them', async () => {
    jest.mocked(getSavedFormState).mockResolvedValueOnce({
      state: { formField1: 'val1' },
      magicLinkGroupId: 'group-1'
    })

    const request = signedInRequest({
      isAuthenticated: true,
      credentials: { accessToken: 'access-1' }
    })

    await expect(signInStrategy.start(request, context)).resolves.toEqual({
      kind: 'resume',
      state: { formField1: 'val1' },
      magicLinkGroupId: 'group-1'
    })
    expect(getSavedFormState).toHaveBeenCalledWith(
      'access-1',
      'fd4e6453-fb32-43e4-b4cf-12b381a713de'
    )
  })

  it("shows the error page when the record is not the signed-in citizen's", async () => {
    jest
      .mocked(getSavedFormState)
      .mockRejectedValueOnce(new Error('Could not read the saved form'))

    const request = signedInRequest({
      isAuthenticated: true,
      credentials: { accessToken: 'access-1' }
    })

    await expect(signInStrategy.start(request, context)).resolves.toEqual({
      kind: 'error'
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { ResumeContext } from '~/src/server/resume/types.js'
 */
