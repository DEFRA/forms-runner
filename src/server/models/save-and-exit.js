import { crumbSchema, stateSchema } from '@defra/forms-engine-plugin/schema.js'
import { SecurityQuestionsEnum, slugSchema } from '@defra/forms-model'
import Joi from 'joi'

import { config } from '~/src/config/index.js'
import { FORM_PREFIX } from '~/src/server/constants.js'

const detailsPageTitle = 'Save your progress for later'
const confirmationPageTitle = 'Your progress has been saved'

// Field names/ids
const email = 'email'
const emailConfirmation = 'emailConfirmation'
const securityQuestion = 'securityQuestion'
const securityAnswer = 'securityAnswer'

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

  const emailError = err.details.find((item) => item.path[0] === email)
  const emailConfirmationError = err.details.find(
    (item) => item.path[0] === emailConfirmation
  )
  const securityQuestionError = err.details.find(
    (item) => item.path[0] === securityQuestion
  )
  const securityAnswerError = err.details.find(
    (item) => item.path[0] === securityAnswer
  )
  const errors = []

  if (emailError) {
    errors.push({ text: emailError.message, href: `#${email}` })
  }

  if (emailConfirmationError) {
    errors.push({
      text: emailConfirmationError.message,
      href: `#${emailConfirmation}`
    })
  }

  if (securityQuestionError) {
    errors.push({
      text: securityQuestionError.message,
      href: `#${securityQuestion}`
    })
  }

  if (securityAnswerError) {
    errors.push({
      text: securityAnswerError.message,
      href: `#${securityAnswer}`
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
    id: email,
    name: email,
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
    id: emailConfirmation,
    name: emailConfirmation,
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
    id: securityQuestion,
    name: securityQuestion,
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
    id: securityAnswer,
    name: securityAnswer,
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

/**
 * Save and exit params
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
    securityAnswer: Joi.string().min(3).max(40).required().messages({
      'string.min': 'Your answer must be between 3 and 40 characters long',
      'string.max': 'Your answer must be between 3 and 40 characters long',
      '*': 'Enter an answer to the security question'
    })
  })
  .required()

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
 * @param {SaveAndExitPayload} [payload]
 * @param {FormStatus} [status]
 * @param {Error} [err]
 */
export function detailsViewModel(metadata, payload, status, err) {
  const { slug, title } = metadata
  const isPreview = !!status
  const formPath = isPreview
    ? `${FORM_PREFIX}/preview/${status}/${slug}`
    : `${FORM_PREFIX}/${slug}`

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
    [email]: buildEmailField(payload, emailError),
    [emailConfirmation]: buildEmailConfirmationField(
      payload,
      emailConfirmationError
    ),
    [securityQuestion]: buildSecurityQuestionField(
      payload,
      securityQuestionError
    ),
    [securityAnswer]: buildSecurityAnswerField(payload, securityAnswerError)
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
  const isPreview = !!status
  const formPath = isPreview
    ? `${FORM_PREFIX}/preview/${status}/${slug}`
    : `${FORM_PREFIX}/${slug}`

  return {
    name: title,
    serviceUrl: formPath,
    pageTitle: confirmationPageTitle,
    email,
    saveAndExitExpiryDays
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
 * @typedef {object} SaveAndExitQuery
 * @property {FormStatus} [status] - the form status (draft/live) when in preview mode
 */

/**
 * @typedef {object} SaveAndExitPayload
 * @property {string} email - email
 * @property {string} emailConfirmation - email confirmation
 * @property {string} securityQuestion - the security question
 * @property {string} securityAnswer - the security answer
 */

/**
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { FormStatus } from '@defra/forms-engine-plugin/types'
 */
