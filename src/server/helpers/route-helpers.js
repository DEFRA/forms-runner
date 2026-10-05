import {
  FORM_PREFIX,
  HOMEPAGE_PREFIX,
  PREVIEW_PATH_PREFIX
} from '~/src/server/constants.js'

/**
 * Get the start url of a form
 * @param {FormMetadata} form
 * @param {boolean} isPreview
 * @param {FormStatus} state
 * @returns {string}
 */
export function getFormHref(form, isPreview, state) {
  const { slug } = form

  return isPreview
    ? `${FORM_PREFIX}${PREVIEW_PATH_PREFIX}/${state}/${slug}`
    : `${FORM_PREFIX}/${slug}`
}

/**
 * Get the homepage href
 * @param {FormMetadata} form
 * @param {SavedFormState} savedForm
 * @returns {string}
 */
export function getHomepageHref(form, savedForm) {
  const { slug } = form
  const { isPreview, status: state } = savedForm.form

  return isPreview
    ? `${HOMEPAGE_PREFIX}${PREVIEW_PATH_PREFIX}/${state}/${slug}`
    : `${HOMEPAGE_PREFIX}/${slug}`
}

/**
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { FormStatus } from '@defra/forms-engine-plugin/types'
 * @import { SavedFormState } from '~/src/server/services/submissionService.js'
 */
