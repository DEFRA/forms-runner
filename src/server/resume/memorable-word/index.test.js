import { memorableWordStrategy } from '~/src/server/resume/memorable-word/index.js'

describe('memorableWordStrategy', () => {
  const request = /** @type {unknown} */ ({})

  const context = /** @type {ResumeContext} */ (
    /** @type {unknown} */ ({
      form: { slug: 'my-form-to-resume' },
      details: { authType: 'memorableWord' },
      formId: 'eab6ac6c-79b6-439f-bd94-d93eb121b3f1',
      magicLinkId: 'fd4e6453-fb32-43e4-b4cf-12b381a713de',
      slugAndState: ''
    })
  )

  it('sends the citizen to the page that asks for the memorable word', async () => {
    await expect(
      memorableWordStrategy.start(request, context)
    ).resolves.toEqual({
      kind: 'redirect',
      location:
        '/resume-form-verify/eab6ac6c-79b6-439f-bd94-d93eb121b3f1/fd4e6453-fb32-43e4-b4cf-12b381a713de/my-form-to-resume'
    })
  })

  it('keeps the preview state in the path of a draft form', async () => {
    await expect(
      memorableWordStrategy.start(
        request,
        /** @type {ResumeContext} */ (
          /** @type {unknown} */ ({ ...context, slugAndState: '/draft' })
        )
      )
    ).resolves.toEqual({
      kind: 'redirect',
      location:
        '/resume-form-verify/eab6ac6c-79b6-439f-bd94-d93eb121b3f1/fd4e6453-fb32-43e4-b4cf-12b381a713de/my-form-to-resume/draft'
    })
  })
})

/**
 * @import { ResumeContext } from '~/src/server/resume/types.ts'
 */
