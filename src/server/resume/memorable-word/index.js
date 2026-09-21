import { resumeVerifyPath } from '~/src/server/resume/memorable-word/paths.js'

/**
 * Resumes a record that a memorable word protects. The word is checked on the
 * verify page rather than here, so this function only sends the citizen there.
 * @type {Resume}
 */
export const resumeMemorableWord = (request, context) => {
  const { formId, magicLinkId, form, slugAndState } = context

  return Promise.resolve({
    kind: 'redirect',
    location: resumeVerifyPath(formId, magicLinkId, form.slug, slugAndState)
  })
}

/**
 * @import { Resume } from '~/src/server/resume/types.js'
 */
