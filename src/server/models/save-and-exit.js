import { crumbSchema, stateSchema } from '@defra/forms-engine-plugin/schema.js'
import { SecurityQuestionsEnum, slugSchema } from '@defra/forms-model'
import Joi from 'joi'

import { config } from '~/src/config/index.js'
import { FORM_PREFIX } from '~/src/server/constants.js'
import { createJoiError } from '~/src/server/helpers/error-helper.js'

const detailsPageTitle = 'Save your progress for later'
const confirmationPageTitle = 'Your progress has been saved'

const MIN_PASSWORD_LENGTH = 3
const MAX_PASSWORD_LENGTH = 40

// Field names/ids
const emailFieldName = 'email'
const emailConfirmationFieldName = 'emailConfirmation'
const securityQuestionFieldName = 'securityQuestion'
const securityAnswerFieldName = 'securityAnswer'

const GOVUK_LABEL__M = 'govuk-label--m'
const saveAndExitExpiryDays = config.get('saveAndExitExpiryDays')

/**
 * @type { SecurityQuestion[]}
 */
const securityQuestions = [
  {
    text: 'What is a memorable place you have visited?',
    value: SecurityQuestionsEnum.MemorablePlace
  },
  {
    text: 'What is the name of your favourite character from a story or TV show?',
    value: SecurityQuestionsEnum.CharacterName
  },
  {
    text: 'What album or song to you always recommend to others?',
    value: SecurityQuestionsEnum.AudioRecommendation
  }
]

/**
 * Build form errors
 * @param {Error} [err]
 */
function buildErrors(err) {
  const hasErrors = Joi.isError(err) && err.details.length > 0

  if (!hasErrors) {
    return {}
  }

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

  if (emailError) {
    errors.push({ text: emailError.message, href: `#${emailFieldName}` })
  }

  if (emailConfirmationError) {
    errors.push({
      text: emailConfirmationError.message,
      href: `#${emailConfirmationFieldName}`
    })
  }

  if (securityQuestionError) {
    errors.push({
      text: securityQuestionError.message,
      href: `#${securityQuestionFieldName}`
    })
  }

  if (securityAnswerError) {
    errors.push({
      text: securityAnswerError.message,
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
 * @param {SaveAndExitPayload} [payload] - the form payload
 * @param {Joi.ValidationErrorItem} [error] - the email error
 */
function buildEmailField(payload, error) {
  return {
    id: emailFieldName,
    name: emailFieldName,
    label: {
      text: 'Your email address',
      classes: GOVUK_LABEL__M,
      isPageHeading: false
    },
    hint: {
      text: 'Use the email address you want the link to go to'
    },
    value: payload?.email,
    errorMessage: error && { text: error.message }
  }
}

/**
 * Email confirmation Field
 * @param {SaveAndExitPayload} [payload] - the form payload
 * @param {Joi.ValidationErrorItem} [error] - the email confirmation error
 */
function buildEmailConfirmationField(payload, error) {
  return {
    id: emailConfirmationFieldName,
    name: emailConfirmationFieldName,
    label: {
      text: 'Confirm your email address',
      classes: GOVUK_LABEL__M,
      isPageHeading: false
    },
    value: payload?.emailConfirmation,
    errorMessage: error && {
      text: error.message
    }
  }
}

/**
 * Security question field
 * @param {SaveAndExitPayload} [payload] - the form payload
 * @param {Joi.ValidationErrorItem} [error] - the security question error
 */
function buildSecurityQuestionField(payload, error) {
  return {
    id: securityQuestionFieldName,
    name: securityQuestionFieldName,
    fieldset: {
      legend: {
        text: 'Choose a security question to answer',
        classes: 'govuk-fieldset__legend--m',
        isPageHeading: false
      }
    },
    items: securityQuestions,
    value: payload?.securityQuestion,
    errorMessage: error && {
      text: error.message
    }
  }
}

/**
 * Security answer field
 * @param {SaveAndExitPayload} [payload] - the form payload
 * @param {Joi.ValidationErrorItem} [error] - the security answer error
 */
function buildSecurityAnswerField(payload, error) {
  return {
    id: securityAnswerFieldName,
    name: securityAnswerFieldName,
    label: {
      text: 'Your answer to the security question',
      classes: GOVUK_LABEL__M
    },
    value: payload?.securityAnswer,
    errorMessage: error && {
      text: error.message
    }
  }
}

export const securityAnswerSchema = Joi.string()
  .min(MIN_PASSWORD_LENGTH)
  .max(MAX_PASSWORD_LENGTH)
  .required()
  .messages({
    'string.min': 'Your answer must be between 3 and 40 characters long',
    'string.max': 'Your answer must be between 3 and 40 characters long',
    '*': 'Enter an answer to the security question'
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
    email: Joi.string().email().required().messages({
      'string.email':
        'Enter an email address in the correct format, for example, hello@example.com',
      '*': 'Enter an email address'
    }),
    emailConfirmation: Joi.string()
      .valid(Joi.ref('email'))
      .required()
      .messages({
        '*': 'Your email address does not match. Check and try again.'
      }),
    securityQuestion: Joi.string()
      .valid(...securityQuestions.map(({ value }) => value.toString()))
      .required()
      .messages({
        '*': 'Choose a security question to answer'
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
 */
export function detailsViewModel(metadata, status, payload, err) {
  const { slug, title } = metadata
  const formPath = constructFormUrl(slug, status)

  const backLink = {
    href: formPath
  }

  const {
    errors,
    emailError,
    emailConfirmationError,
    securityQuestionError,
    securityAnswerError
  } = buildErrors(err)

  // Model fields
  const fields = {
    [emailFieldName]: buildEmailField(payload, emailError),
    [emailConfirmationFieldName]: buildEmailConfirmationField(
      payload,
      emailConfirmationError
    ),
    [securityQuestionFieldName]: buildSecurityQuestionField(
      payload,
      securityQuestionError
    ),
    [securityAnswerFieldName]: buildSecurityAnswerField(
      payload,
      securityAnswerError
    )
  }

  // Model buttons
  const continueButton = {
    text: 'Save progress'
  }
  const cancelButton = {
    text: 'Cancel',
    classes: 'govuk-button--secondary',
    href: formPath
  }

  return {
    name: title,
    serviceUrl: formPath,
    pageTitle: detailsPageTitle,
    backLink,
    errors,
    fields,
    buttons: { continueButton, cancelButton }
  }
}

/**
 * The save and exit confirmation form view model
 * @param {FormMetadata} metadata
 * @param {string} email
 * @param {FormStatus} [status]
 */
export function confirmationViewModel(metadata, email, status) {
  const { slug, title } = metadata
  const formPath = constructFormUrl(slug, status)

  return {
    name: title,
    serviceUrl: formPath,
    pageTitle: confirmationPageTitle,
    email,
    saveAndExitExpiryDays
  }
}

/**
 * The save and exit password form view model
 * @param {string} formTitle
 * @param {SecurityQuestionsEnum} securityQuestion - the security question
 * @param {number} attemptsLeft
 * @param {SaveAndExitResumePasswordPayload} [payload]
 * @param {Error} [err]
 */
export function passwordViewModel(
  formTitle,
  securityQuestion,
  attemptsLeft,
  payload,
  err
) {
  const pageTitle = 'Continue with your form'
  const { errors, securityAnswerError } = buildErrors(err)

  // Model fields
  const fields = {
    [securityAnswerFieldName]: {
      id: securityAnswerFieldName,
      name: securityAnswerFieldName,
      label: {
        text: securityQuestions.find((x) => x.value === securityQuestion)?.text,
        classes: GOVUK_LABEL__M
      },
      value: payload?.securityAnswer ?? '',
      errorMessage: securityAnswerError && {
        text: securityAnswerError.message
      }
    }
  }

  // Model buttons
  const continueButton = {
    text: 'Continue'
  }

  return {
    name: formTitle,
    pageTitle,
    errors,
    fields,
    attemptsLeft,
    buttons: { continueButton }
  }
}

/**
 * The save and exit error form view model
 * @param {{ slug: string }} payload
 */
export function resumeErrorViewModel(payload) {
  const pageTitle = 'You cannot resume your form'

  // Model buttons
  const continueButton = {
    text: 'Start form again',
    href: `/form/${payload.slug}`
  }

  return {
    pageTitle,
    buttons: payload.slug ? { continueButton } : {}
  }
}

/**
 * @param {number} attemptsRemaining
 */
export function createInvalidPasswordError(attemptsRemaining) {
  return createJoiError(
    securityAnswerFieldName,
    `Your answer is incorrect. You have ${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining.`
  )
}

/**
 * The save and exit form view model when user is locked out
 * @param {FormMetadata} form
 * @param {SaveAndExitResumeDetails} validatedLink
 * @param {number} maxPasswordAttempts
 */
export function lockedOutViewModel(form, validatedLink, maxPasswordAttempts) {
  return {
    name: form.title,
    maxPasswordAttempts,
    buttons: {
      continueButton: {
        text: 'Start form again',
        href: constructFormUrl(form.slug, validatedLink.form.status)
      }
    }
  }
}

/**
 * @param {string} slug
 * @param {FormStatus} [status]
 */
export function constructFormUrl(slug, status) {
  if (!status) {
    return `${FORM_PREFIX}/${slug}`
  }

  return `${FORM_PREFIX}/preview/${status}/${slug}`
}

/**
 * The save and exit success form view model
 * @param {FormMetadata} form
 * @param {FormStatus} [status]
 */
export function resumeSuccessViewModel(form, status) {
  // Model buttons
  const continueButton = {
    text: 'Resume form',
    href: constructFormUrl(form.slug, status)
  }

  return {
    name: form.title,
    buttons: { continueButton }
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
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { FormStatus } from '@defra/forms-engine-plugin/types'
 * @import { SaveAndExitResumeDetails } from '~/src/server/types.js'
 */
