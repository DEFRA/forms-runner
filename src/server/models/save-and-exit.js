import { crumbSchema, stateSchema } from '@defra/forms-engine-plugin/schema.js'
import {
  ControllerPath,
  SecurityQuestionsEnum,
  preventUnicodeInEmail,
  slugSchema
} from '@defra/forms-model'
import Joi from 'joi'

import { config } from '~/src/config/index.js'
import { FORM_PREFIX } from '~/src/server/constants.js'
import { createJoiError } from '~/src/server/helpers/error-helper.js'
import { getFeedbackFormLink } from '~/src/server/utils/utils.js'

const MIN_PASSWORD_LENGTH = 3
const MAX_PASSWORD_LENGTH = 40

// Field names/ids
const emailFieldName = 'email'
const emailConfirmationFieldName = 'emailConfirmation'
const securityQuestionFieldName = 'securityQuestion'
const securityAnswerFieldName = 'securityAnswer'
const general = 'general'

const GOVUK_LABEL__M = 'govuk-label--m'
const saveAndExitExpiryDays = config.get('saveAndExitExpiryDays')

/**
 * Map from SecurityQuestionsEnum value to i18n key suffix
 */
const securityQuestionKeyMap = /** @type {Record<string, string>} */ ({
  [SecurityQuestionsEnum.MemorablePlace]:
    'saveAndExit.details.securityQuestions.memorablePlace',
  [SecurityQuestionsEnum.CharacterName]:
    'saveAndExit.details.securityQuestions.characterName',
  [SecurityQuestionsEnum.AudioRecommendation]:
    'saveAndExit.details.securityQuestions.audioRecommendation'
})

/**
 * Returns the translated list of security questions
 * @param {Translator} translator
 * @returns {SecurityQuestion[]}
 */
function getSecurityQuestions(translator) {
  const { t } = translator
  return [
    {
      text: /** @type {string} */ (
        t('saveAndExit.details.securityQuestions.memorablePlace')
      ),
      value: SecurityQuestionsEnum.MemorablePlace
    },
    {
      text: /** @type {string} */ (
        t('saveAndExit.details.securityQuestions.characterName')
      ),
      value: SecurityQuestionsEnum.CharacterName
    },
    {
      text: /** @type {string} */ (
        t('saveAndExit.details.securityQuestions.audioRecommendation')
      ),
      value: SecurityQuestionsEnum.AudioRecommendation
    }
  ]
}

/**
 * Resolve an error message: i18n key for Joi schema errors, raw string for
 * errors already built via createJoiError (type === 'custom').
 * @param {Joi.ValidationErrorItem} detail
 * @param {Translator} translator
 */
function resolveMessage(detail, translator) {
  if (detail.type === 'custom') {
    return detail.message
  }
  const { t } = translator
  return /** @type {string} */ (t(detail.message))
}

/**
 * Build form errors
 * @param {Translator} translator
 * @param {Error} [err]
 */
function buildErrors(translator, err) {
  const hasErrors = Joi.isError(err) && err.details.length > 0

  if (!hasErrors) {
    return {}
  }

  const generalError = err.details.find((item) => item.path[0] === general)
  const emailError = err.details.find((item) => item.path[0] === emailFieldName)
  const emailConfirmationError = err.details.find(
    (item) => item.path[0] === emailConfirmationFieldName
  )
  const securityQuestionError = err.details.find(
    (item) => item.path[0] === securityQuestionFieldName
  )
  const securityAnswerError = err.details.find(
    (item) => item.path[0] === securityAnswerFieldName
  )

  const errors = []

  if (generalError) {
    errors.push({ text: resolveMessage(generalError, translator), href: '#' })
  }

  if (emailError) {
    errors.push({
      text: resolveMessage(emailError, translator),
      href: `#${emailFieldName}`
    })
  }

  if (emailConfirmationError) {
    errors.push({
      text: resolveMessage(emailConfirmationError, translator),
      href: `#${emailConfirmationFieldName}`
    })
  }

  if (securityQuestionError) {
    errors.push({
      text: resolveMessage(securityQuestionError, translator),
      href: `#${securityQuestionFieldName}`
    })
  }

  if (securityAnswerError) {
    errors.push({
      text: resolveMessage(securityAnswerError, translator),
      href: `#${securityAnswerFieldName}`
    })
  }

  return {
    errors,
    emailError,
    emailConfirmationError,
    securityQuestionError,
    securityAnswerError
  }
}

/**
 * Email Field
 * @param {Translator} translator
 * @param {SaveAndExitPayload} [payload] - the form payload
 * @param {Joi.ValidationErrorItem} [error] - the email error
 */
function buildEmailField(translator, payload, error) {
  const { t } = translator
  return {
    id: emailFieldName,
    name: emailFieldName,
    label: {
      text: t('saveAndExit.details.emailLabel'),
      classes: GOVUK_LABEL__M,
      isPageHeading: false
    },
    hint: {
      text: t('saveAndExit.details.emailHint')
    },
    value: payload?.email,
    errorMessage: error && { text: resolveMessage(error, translator) }
  }
}

/**
 * Email confirmation Field
 * @param {Translator} translator
 * @param {SaveAndExitPayload} [payload] - the form payload
 * @param {Joi.ValidationErrorItem} [error] - the email confirmation error
 */
function buildEmailConfirmationField(translator, payload, error) {
  const { t } = translator
  return {
    id: emailConfirmationFieldName,
    name: emailConfirmationFieldName,
    label: {
      text: t('saveAndExit.details.emailConfirmationLabel'),
      classes: GOVUK_LABEL__M,
      isPageHeading: false
    },
    hint: {
      text: t('saveAndExit.details.emailConfirmationHint')
    },
    value: payload?.emailConfirmation,
    errorMessage: error && {
      text: resolveMessage(error, translator)
    }
  }
}

/**
 * Security question field
 * @param {Translator} translator
 * @param {SaveAndExitPayload} [payload] - the form payload
 * @param {Joi.ValidationErrorItem} [error] - the security question error
 */
function buildSecurityQuestionField(translator, payload, error) {
  const { t } = translator
  return {
    id: securityQuestionFieldName,
    name: securityQuestionFieldName,
    fieldset: {
      legend: {
        text: t('saveAndExit.details.securityQuestionLegend'),
        classes: 'govuk-fieldset__legend--m',
        isPageHeading: false
      }
    },
    items: getSecurityQuestions(translator),
    value: payload?.securityQuestion,
    errorMessage: error && {
      text: resolveMessage(error, translator)
    }
  }
}

/**
 * Security answer field
 * @param {Translator} translator
 * @param {SaveAndExitPayload} [payload] - the form payload
 * @param {Joi.ValidationErrorItem} [error] - the security answer error
 */
function buildSecurityAnswerField(translator, payload, error) {
  const { t } = translator
  return {
    id: securityAnswerFieldName,
    name: securityAnswerFieldName,
    label: {
      text: t('saveAndExit.details.securityAnswerLabel'),
      classes: GOVUK_LABEL__M
    },
    value: payload?.securityAnswer,
    errorMessage: error && {
      text: resolveMessage(error, translator)
    }
  }
}

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
 * @param {string} formPath
 */
function constructFormSummaryUrl(formPath) {
  return `${formPath}${ControllerPath.Summary}`
}

export const securityAnswerSchema = Joi.string()
  .min(MIN_PASSWORD_LENGTH)
  .max(MAX_PASSWORD_LENGTH)
  .required()
  .messages({
    'string.min': 'saveAndExit.details.validation.securityAnswerLength',
    'string.max': 'saveAndExit.details.validation.securityAnswerLength',
    '*': 'saveAndExit.details.validation.securityAnswerRequired'
  })

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
 * Save and exit form payload schema
 */
export const payloadSchema = Joi.object()
  .keys({
    crumb: crumbSchema,
    email: Joi.string()
      .trim()
      .email()
      .custom((value, helpers) => preventUnicodeInEmail(value, helpers))
      .required()
      .messages({
        'string.email': 'saveAndExit.details.validation.emailFormat',
        'string.unicode': 'saveAndExit.details.validation.emailUnicode',
        '*': 'saveAndExit.details.validation.emailRequired'
      }),
    emailConfirmation: Joi.string()
      .valid(Joi.ref('email'))
      .required()
      .messages({
        '*': 'saveAndExit.details.validation.emailConfirmation'
      }),
    securityQuestion: Joi.string()
      .valid(
        ...[
          SecurityQuestionsEnum.MemorablePlace,
          SecurityQuestionsEnum.CharacterName,
          SecurityQuestionsEnum.AudioRecommendation
        ].map((v) => v.toString())
      )
      .required()
      .messages({
        '*': 'saveAndExit.details.validation.securityQuestionRequired'
      }),
    securityAnswer: securityAnswerSchema
  })
  .required()

/**
 * Save and exit resume params schema
 */
export const resumeParamsSchema = Joi.object()
  .keys({
    formId: Joi.string().required(),
    magicLinkId: Joi.string().uuid().required(),
    slug: slugSchema,
    state: stateSchema.optional()
  })
  .required()

/**
 * Save and exit validate payload schema
 */
export const validatePayloadSchema = Joi.object().keys({
  crumb: crumbSchema,
  securityAnswer: securityAnswerSchema
})

/**
 * Get save and exit session key
 * @param {string} slug
 * @param {FormStatus} [state]
 */
export function getKey(slug, state) {
  return `save-and-exit-${slug}-${state ?? ''}`
}

/**
 * The save and exit details form view model
 * @param {FormMetadata} metadata
 * @param {Translator} translator
 * @param {FormStatus} [status]
 * @param {SaveAndExitPayload} [payload]
 * @param {Error} [err]
 */
export function detailsViewModel(metadata, translator, status, payload, err) {
  const { slug, title, id } = metadata
  const formPath = constructFormUrl(slug, status)
  const formSummaryPath = constructFormSummaryUrl(formPath)
  const { t } = translator

  const backLink = {
    href: formSummaryPath,
    text: t('common.back')
  }

  const {
    errors,
    emailError,
    emailConfirmationError,
    securityQuestionError,
    securityAnswerError
  } = buildErrors(translator, err)

  // Model fields
  const fields = {
    [emailFieldName]: buildEmailField(translator, payload, emailError),
    [emailConfirmationFieldName]: buildEmailConfirmationField(
      translator,
      payload,
      emailConfirmationError
    ),
    [securityQuestionFieldName]: buildSecurityQuestionField(
      translator,
      payload,
      securityQuestionError
    ),
    [securityAnswerFieldName]: buildSecurityAnswerField(
      translator,
      payload,
      securityAnswerError
    )
  }

  // Model buttons
  const continueButton = {
    text: t('saveAndExit.details.saveButton')
  }
  const cancelButton = {
    text: t('saveAndExit.details.cancelButton'),
    classes: 'govuk-button--secondary',
    href: formSummaryPath
  }

  return {
    name: title,
    serviceUrl: formPath,
    pageTitle: t('saveAndExit.details.pageTitle'),
    backLink,
    errors,
    fields,
    buttons: { continueButton, cancelButton },
    context: { translator },
    ...getFeedbackFormLink(id)
  }
}

/**
 * The save and exit confirmation form view model
 * @param {FormMetadata} metadata
 * @param {string} email
 * @param {Translator} translator
 * @param {FormStatus} [status]
 */
export function confirmationViewModel(metadata, email, translator, status) {
  const { slug, title, id } = metadata
  const formPath = constructFormUrl(slug, status)
  const { t } = translator

  return {
    name: title,
    serviceUrl: formPath,
    pageTitle: t('saveAndExit.confirmation.pageTitle'),
    email,
    saveAndExitExpiryDays,
    context: { translator },
    ...getFeedbackFormLink(id)
  }
}

/**
 * The save and exit password form view model
 * @param {FormMetadata} metadata - the metadata of the form
 * @param {SecurityQuestionsEnum} securityQuestion - the security question
 * @param {number} attemptsLeft
 * @param {Translator} translator
 * @param {SaveAndExitResumePasswordPayload} [payload]
 * @param {Error} [err]
 */
export function passwordViewModel(
  metadata,
  securityQuestion,
  attemptsLeft,
  translator,
  payload,
  err
) {
  const { t } = translator
  const { errors, securityAnswerError } = buildErrors(translator, err)

  const questionKey = securityQuestionKeyMap[securityQuestion]
  const questionText = questionKey
    ? /** @type {string} */ (t(questionKey))
    : undefined

  // Model fields
  const fields = {
    [securityAnswerFieldName]: {
      id: securityAnswerFieldName,
      name: securityAnswerFieldName,
      label: {
        text: questionText,
        classes: GOVUK_LABEL__M
      },
      value: payload?.securityAnswer ?? '',
      errorMessage: securityAnswerError && {
        text: resolveMessage(securityAnswerError, translator)
      }
    }
  }

  // Model buttons
  const continueButton = {
    text: t('saveAndExit.resumePassword.continueButton')
  }

  return {
    name: metadata.title,
    pageTitle: t('saveAndExit.resumePassword.pageTitle'),
    errors,
    fields,
    attemptsLeft,
    buttons: { continueButton },
    context: { translator },
    ...getFeedbackFormLink(metadata.id)
  }
}

/**
 * The save and exit error form view model
 * @param {{ slug: string }} payload
 * @param {Translator} translator - the translator instance
 */
export function resumeErrorViewModel(payload, translator) {
  const { t } = translator

  // Model buttons
  const continueButton = {
    text: t('saveAndExit.resumeError.continueButton'),
    href: `/form/${payload.slug}`
  }

  return {
    pageTitle: t('saveAndExit.resumeError.pageTitle'),
    buttons: payload.slug ? { continueButton } : {},
    context: { translator },
    ...getFeedbackFormLink('')
  }
}

/**
 * @param {number} attemptsRemaining
 * @param {Translator} translator
 */
export function createInvalidPasswordError(attemptsRemaining, translator) {
  const { t } = translator
  const message = /** @type {string} */ (
    t('saveAndExit.details.validation.invalidPassword', {
      count: attemptsRemaining
    })
  )
  return createJoiError(securityAnswerFieldName, message)
}

/**
 * The save and exit form view model when user is locked out
 * @param {FormMetadata} form
 * @param {SaveAndExitResumeDetails} validatedLink
 * @param {number} maxPasswordAttempts
 * @param {Translator} translator - the translator instance
 */
export function lockedOutViewModel(
  form,
  validatedLink,
  maxPasswordAttempts,
  translator
) {
  const { t } = translator

  return {
    name: form.title,
    maxPasswordAttempts,
    buttons: {
      continueButton: {
        text: t('saveAndExit.resumeErrorLocked.continueButton'),
        href: constructFormUrl(
          form.slug,
          validatedLink.form.isPreview ? validatedLink.form.status : undefined
        )
      }
    },
    context: { translator },
    ...getFeedbackFormLink(form.id)
  }
}

/**
 * The save and exit success form view model
 * @param {FormMetadata} form
 * @param {Translator} translator - the translator instance
 * @param {FormStatus} [status]
 */
export function resumeSuccessViewModel(form, translator, status) {
  const { t } = translator
  const formPath = constructFormUrl(form.slug, status)
  const formSummaryPath = constructFormSummaryUrl(formPath)

  // Model buttons
  const continueButton = {
    text: t('saveAndExit.resumeSuccess.continueButton'),
    href: formSummaryPath
  }

  return {
    pageTitle: t('saveAndExit.resumeSuccess.pageTitle'),
    name: form.title,
    serviceUrl: formPath,
    buttons: { continueButton },
    context: { translator },
    ...getFeedbackFormLink(form.id)
  }
}

/**
 * @typedef {object} SecurityQuestion
 * @property {string} text - the question text
 * @property {SecurityQuestionsEnum} value - the question type value
 */

/**
 * @typedef {object} SaveAndExitParams
 * @property {string} slug - the form slug
 * @property {FormStatus} [state] - the form status (draft/live) when in preview mode
 */

/**
 * @typedef {object} SaveAndExitPayload
 * @property {string} email - email
 * @property {string} emailConfirmation - email confirmation
 * @property {SecurityQuestionsEnum} securityQuestion - the security question
 * @property {string} securityAnswer - the security answer
 */

/**
 * @typedef {object} SaveAndExitResumeParams
 * @property {string} slug - the form slug
 * @property {string} magicLinkId - the link parameter provided in the magic link
 */

/**
 * @typedef {object} SaveAndExitResumePasswordParams
 * @property {string} formId - the form id answer
 * @property {string} magicLinkId - the magic link id
 * @property {string} slug - the form slug
 * @property {FormStatus} [state] - the form status
 */

/**
 * @typedef {object} SaveAndExitResumePasswordPayload
 * @property {string} securityAnswer - the security answer
 */

/**
 * @typedef {object} CustomErrorPayload
 * @property {{ latestId?: string }} [custom] - custom payload
 */

/**
 * @typedef {object} BoomErrorCustomSaveAndExit
 * @property {{ statusCode?: StatusCodes }} [output] - contains status code
 * @property {{ payload?: { latestId?: string }}} [data] - custom payload for save-and-exit
 */

/**
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { StatusCodes } from 'http-status-codes'
 * @import { FormStatus } from '@defra/forms-engine-plugin/types'
 * @import { Translator } from '@defra/forms-engine-plugin/engine/i18n/types.js'
 * @import { SaveAndExitResumeDetails } from '~/src/server/types.js'
 */
