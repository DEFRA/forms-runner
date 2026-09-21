import { resumeMemorableWord } from '~/src/server/resume/memorable-word/index.js'

describe('resumeMemorableWord', () => {
  const request = /** @type {Request} */ (/** @type {unknown} */ ({}))

  const context = {
    form: { slug: 'my-form-to-resume' },
    details: { authType: 'memorableWord' },
    formId: 'eab6ac6c-79b6-439f-bd94-d93eb121b3f1',
    magicLinkId: 'fd4e6453-fb32-43e4-b4cf-12b381a713de',
    slugAndState: ''
  }

  /**
   * The mock carries only the fields this function reads, so it is cast
   * through `unknown` rather than built in full.
   * @param {object} overrides
   * @returns {ResumeContext}
   */
  function resumeContext(overrides = {}) {
    return /** @type {ResumeContext} */ (
      /** @type {unknown} */ ({ ...context, ...overrides })
    )
  }

  it('sends the citizen to the page that asks for the memorable word', async () => {
    await expect(
      resumeMemorableWord(request, resumeContext())
    ).resolves.toEqual({
      kind: 'redirect',
      location:
        '/resume-form-verify/eab6ac6c-79b6-439f-bd94-d93eb121b3f1/fd4e6453-fb32-43e4-b4cf-12b381a713de/my-form-to-resume'
    })
  })

  it('keeps the preview state in the path of a draft form', async () => {
    await expect(
      resumeMemorableWord(request, resumeContext({ slugAndState: '/draft' }))
    ).resolves.toEqual({
      kind: 'redirect',
      location:
        '/resume-form-verify/eab6ac6c-79b6-439f-bd94-d93eb121b3f1/fd4e6453-fb32-43e4-b4cf-12b381a713de/my-form-to-resume/draft'
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { ResumeContext } from '~/src/server/resume/types.js'
 */
