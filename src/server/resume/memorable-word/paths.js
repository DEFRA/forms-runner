import { RESUME_VERIFY_PATH } from '~/src/server/constants.js'

/**
 * The path that asks a citizen for the memorable word of a saved form.
 * @param {string} formId
 * @param {string} magicLinkId
 * @param {string} slug
 * @param {string} slugAndState - `/draft` for a preview, empty for a live form
 */
export function resumeVerifyPath(formId, magicLinkId, slug, slugAndState) {
  return `${RESUME_VERIFY_PATH}/${formId}/${magicLinkId}/${slug}${slugAndState}`
}
