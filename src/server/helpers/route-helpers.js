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
export function getStartNewFormHref(form, isPreview, state) {
  const { slug } = form

  return isPreview
    ? `/start-new-form${PREVIEW_PATH_PREFIX}/${state}/${slug}`
    : `/start-new-form/${slug}`
}

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
 * @param {string} slug
 * @param {FormStatus} [status]
 */
export function constructHomepageLink(slug, status) {
  if (!status) {
    return `${HOMEPAGE_PREFIX}/${slug}`
  }

  return `${HOMEPAGE_PREFIX}${PREVIEW_PATH_PREFIX}/${status}/${slug}`
}

/**
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { FormStatus } from '@defra/forms-engine-plugin/types'
 */
