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
import { t } from '~/src/server/i18n/index.js'
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
 * @param {string} language
 * @returns {SecurityQuestion[]}
 */
function getSecurityQuestions(language) {
  return [
    {
      text: /** @type {string} */ (
        t('saveAndExit.details.securityQuestions.memorablePlace', language)
      ),
      value: SecurityQuestionsEnum.MemorablePlace
    },
    {
      text: /** @type {string} */ (
        t('saveAndExit.details.securityQuestions.characterName', language)
      ),
      value: SecurityQuestionsEnum.CharacterName
    },
    {
      text: /** @type {string} */ (
        t('saveAndExit.details.securityQuestions.audioRecommendation', language)
      ),
      value: SecurityQuestionsEnum.AudioRecommendation
    }
  ]
}

/**
 * Resolve an error message: i18n key for Joi schema errors, raw string for
 * errors already built via createJoiError (type === 'custom').
 * @param {Joi.ValidationErrorItem} detail
 * @param {string} language
 */
function resolveMessage(detail, language) {
  if (detail.type === 'custom') {
    return detail.message
  }
  return /** @type {string} */ (t(detail.message, language))
}

/**
 * Build form errors
 * @param {Error} [err]
 * @param {string} [language]
 */
function buildErrors(err, language = 'en-GB') {
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
    errors.push({ text: resolveMessage(generalError, language), href: '#' })
  }

  if (emailError) {
    errors.push({
      text: resolveMessage(emailError, language),
      href: `#${emailFieldName}`
    })
  }

  if (emailConfirmationError) {
    errors.push({
      text: resolveMessage(emailConfirmationError, language),
      href: `#${emailConfirmationFieldName}`
    })
  }

  if (securityQuestionError) {
    errors.push({
      text: resolveMessage(securityQuestionError, language),
      href: `#${securityQuestionFieldName}`
    })
  }

  if (securityAnswerError) {
    errors.push({
      text: resolveMessage(securityAnswerError, language),
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
 * @param {string} language
 * @param {SaveAndExitPayload} [payload] - the form payload
 * @param {Joi.ValidationErrorItem} [error] - the email error
 */
function buildEmailField(language, payload, error) {
  return {
    id: emailFieldName,
    name: emailFieldName,
    label: {
      text: t('saveAndExit.details.emailLabel', language),
      classes: GOVUK_LABEL__M,
      isPageHeading: false
    },
    hint: {
      text: t('saveAndExit.details.emailHint', language)
    },
    value: payload?.email,
    errorMessage: error && { text: resolveMessage(error, language) }
  }
}

/**
 * Email confirmation Field
 * @param {string} language
 * @param {SaveAndExitPayload} [payload] - the form payload
 * @param {Joi.ValidationErrorItem} [error] - the email confirmation error
 */
function buildEmailConfirmationField(language, payload, error) {
  return {
    id: emailConfirmationFieldName,
    name: emailConfirmationFieldName,
    label: {
      text: t('saveAndExit.details.emailConfirmationLabel', language),
      classes: GOVUK_LABEL__M,
      isPageHeading: false
    },
    hint: {
      text: t('saveAndExit.details.emailConfirmationHint', language)
    },
    value: payload?.emailConfirmation,
    errorMessage: error && {
      text: resolveMessage(error, language)
    }
  }
}

/**
 * Security question field
 * @param {string} language
 * @param {SaveAndExitPayload} [payload] - the form payload
 * @param {Joi.ValidationErrorItem} [error] - the security question error
 */
function buildSecurityQuestionField(language, payload, error) {
  return {
    id: securityQuestionFieldName,
    name: securityQuestionFieldName,
    fieldset: {
      legend: {
        text: t('saveAndExit.details.securityQuestionLegend', language),
        classes: 'govuk-fieldset__legend--m',
        isPageHeading: false
      }
    },
    items: getSecurityQuestions(language),
    value: payload?.securityQuestion,
    errorMessage: error && {
      text: resolveMessage(error, language)
    }
  }
}

/**
 * Security answer field
 * @param {string} language
 * @param {SaveAndExitPayload} [payload] - the form payload
 * @param {Joi.ValidationErrorItem} [error] - the security answer error
 */
function buildSecurityAnswerField(language, payload, error) {
  return {
    id: securityAnswerFieldName,
    name: securityAnswerFieldName,
    label: {
      text: t('saveAndExit.details.securityAnswerLabel', language),
      classes: GOVUK_LABEL__M
    },
    value: payload?.securityAnswer,
    errorMessage: error && {
      text: resolveMessage(error, language)
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
 * @param {FormStatus} [status]
 * @param {SaveAndExitPayload} [payload]
 * @param {Error} [err]
 * @param {string} [language]
 */
export function detailsViewModel(
  metadata,
  status,
  payload,
  err,
  language = 'en-GB'
) {
  const { slug, title, id } = metadata
  const formPath = constructFormUrl(slug, status)
  const formSummaryPath = constructFormSummaryUrl(formPath)

  const backLink = {
    href: formSummaryPath
  }

  const {
    errors,
    emailError,
    emailConfirmationError,
    securityQuestionError,
    securityAnswerError
  } = buildErrors(err, language)

  // Model fields
  const fields = {
    [emailFieldName]: buildEmailField(language, payload, emailError),
    [emailConfirmationFieldName]: buildEmailConfirmationField(
      language,
      payload,
      emailConfirmationError
    ),
    [securityQuestionFieldName]: buildSecurityQuestionField(
      language,
      payload,
      securityQuestionError
    ),
    [securityAnswerFieldName]: buildSecurityAnswerField(
      language,
      payload,
      securityAnswerError
    )
  }

  // Model buttons
  const continueButton = {
    text: t('saveAndExit.details.saveButton', language)
  }
  const cancelButton = {
    text: t('saveAndExit.details.cancelButton', language),
    classes: 'govuk-button--secondary',
    href: formSummaryPath
  }

  return {
    name: title,
    serviceUrl: formPath,
    pageTitle: t('saveAndExit.details.pageTitle', language),
    backLink,
    errors,
    fields,
    buttons: { continueButton, cancelButton },
    ...getFeedbackFormLink(id)
  }
}

/**
 * The save and exit confirmation form view model
 * @param {FormMetadata} metadata
 * @param {string} email
 * @param {FormStatus} [status]
 * @param {string} [language]
 */
export function confirmationViewModel(
  metadata,
  email,
  status,
  language = 'en-GB'
) {
  const { slug, title, id } = metadata
  const formPath = constructFormUrl(slug, status)

  return {
    name: title,
    serviceUrl: formPath,
    pageTitle: t('saveAndExit.confirmation.pageTitle', language),
    email,
    saveAndExitExpiryDays,
    ...getFeedbackFormLink(id)
  }
}

/**
 * The save and exit password form view model
 * @param {FormMetadata} metadata - the metadata of the form
 * @param {SecurityQuestionsEnum} securityQuestion - the security question
 * @param {number} attemptsLeft
 * @param {SaveAndExitResumePasswordPayload} [payload]
 * @param {Error} [err]
 * @param {string} [language]
 */
export function passwordViewModel(
  metadata,
  securityQuestion,
  attemptsLeft,
  payload,
  err,
  language = 'en-GB'
) {
  const { errors, securityAnswerError } = buildErrors(err, language)

  const questionKey = securityQuestionKeyMap[securityQuestion]
  const questionText = questionKey
    ? /** @type {string} */ (t(questionKey, language))
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
        text: resolveMessage(securityAnswerError, language)
      }
    }
  }

  // Model buttons
  const continueButton = {
    text: t('saveAndExit.resumePassword.continueButton', language)
  }

  return {
    name: metadata.title,
    pageTitle: t('saveAndExit.resumePassword.pageTitle', language),
    errors,
    fields,
    attemptsLeft,
    buttons: { continueButton },
    ...getFeedbackFormLink(metadata.id)
  }
}

/**
 * The save and exit error form view model
 * @param {{ slug: string }} payload
 * @param {string} [language]
 */
export function resumeErrorViewModel(payload, language = 'en-GB') {
  // Model buttons
  const continueButton = {
    text: t('saveAndExit.resumeError.continueButton', language),
    href: `/form/${payload.slug}`
  }

  return {
    pageTitle: t('saveAndExit.resumeError.pageTitle', language),
    buttons: payload.slug ? { continueButton } : {},
    ...getFeedbackFormLink('')
  }
}

/**
 * @param {number} attemptsRemaining
 * @param {string} [language]
 */
export function createInvalidPasswordError(
  attemptsRemaining,
  language = 'en-GB'
) {
  const message = /** @type {string} */ (
    t('saveAndExit.details.validation.invalidPassword', language, {
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
 * @param {string} [language]
 */
export function lockedOutViewModel(
  form,
  validatedLink,
  maxPasswordAttempts,
  language = 'en-GB'
) {
  return {
    name: form.title,
    maxPasswordAttempts,
    buttons: {
      continueButton: {
        text: t('saveAndExit.resumeErrorLocked.continueButton', language),
        href: constructFormUrl(
          form.slug,
          validatedLink.form.isPreview ? validatedLink.form.status : undefined
        )
      }
    },
    ...getFeedbackFormLink(form.id)
  }
}

/**
 * The save and exit success form view model
 * @param {FormMetadata} form
 * @param {FormStatus} [status]
 * @param {string} [language]
 */
export function resumeSuccessViewModel(form, status, language = 'en-GB') {
  const formPath = constructFormUrl(form.slug, status)
  const formSummaryPath = constructFormSummaryUrl(formPath)

  // Model buttons
  const continueButton = {
    text: t('saveAndExit.resumeSuccess.continueButton', language),
    href: formSummaryPath
  }

  return {
    pageTitle: t('saveAndExit.resumeSuccess.pageTitle', language),
    name: form.title,
    serviceUrl: formPath,
    buttons: { continueButton },
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
 * @import { SaveAndExitResumeDetails } from '~/src/server/types.js'
 */
