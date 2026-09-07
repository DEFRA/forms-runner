import { stateSchema } from '@defra/forms-engine-plugin/schema.js'
import { slugSchema } from '@defra/forms-model'
import Joi from 'joi'

import { config } from '~/src/config/index.js'
import { FORM_PREFIX, HOMEPAGE_PREFIX } from '~/src/server/constants.js'
import { getFeedbackFormLink } from '~/src/server/utils/utils.js'

const saveAndExitExpiryDays = config.get('saveAndExitExpiryDays')

/**
 * @param {string} slug
 * @param {FormStatus} [status]
 */
function constructFormUrl(slug, status) {
  if (!status) {
    return `${FORM_PREFIX}/${slug}`
  }

  return `${FORM_PREFIX}/preview/${status}/${slug}`
}

/**
 * @param {string} slug
 * @param {FormStatus} [status]
 */
function constructSigninUrl(slug, status) {
  if (!status) {
    return `${HOMEPAGE_PREFIX}/${slug}`
  }

  return `${HOMEPAGE_PREFIX}/preview/${status}/${slug}`
}

/**
 * Save and exit params schema
 */
export const paramsSchema = Joi.object()
  .keys({
    slug: slugSchema,
    state: stateSchema.optional()
  })
  .required()

/**
 * Get save and exit session key
 * @param {string} slug
 * @param {FormStatus} [state]
 */
export function getKey(slug, state) {
  return `save-and-exit-v2-${slug}-${state ?? ''}`
}

/**
 * The save and exit confirmation form view model
 * @param {FormMetadata} metadata
 * @param {Translator} translator
 * @param {FormStatus} [status]
 */
export function confirmationViewModel(metadata, translator, status) {
  const { slug, title, id } = metadata
  const formPath = constructFormUrl(slug, status)
  const signinLink = constructSigninUrl(slug, status)
  const { t } = translator

  return {
    name: title,
    serviceUrl: formPath,
    signinLink,
    pageTitle: t('saveAndExit.confirmation.pageTitle'),
    saveAndExitExpiryDays,
    context: { translator },
    ...getFeedbackFormLink(id)
  }
}

/**
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { FormStatus } from '@defra/forms-engine-plugin/types'
 * @import { Translator } from '@defra/forms-engine-plugin/engine/i18n/types.js'
 */
