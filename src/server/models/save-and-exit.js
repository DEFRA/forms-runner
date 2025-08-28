import { SecurityQuestionsEnum } from '@defra/forms-model'
import Joi from 'joi'

// Field names/ids
const email = 'email'
const emailConfirmation = 'emailConfirmation'
const securityQuestion = 'securityQuestion'
const securityAnswer = 'securityAnswer'

/**
 * Build form errors
 * @param {Error} [err]
 */
function buildErrors(err) {
  const hasErrors = !!(Joi.isError(err) && err.details.length > 0)

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
  const errorList = []

  if (emailError) {
    errorList.push({ text: emailError.message, href: `#${email}` })
  }

  if (emailConfirmationError) {
    errorList.push({
      text: emailConfirmationError.message,
      href: `#${emailConfirmation}`
    })
  }

  if (securityQuestionError) {
    errorList.push({
      text: securityQuestionError.message,
      href: `#${securityQuestion}`
    })
  }

  if (securityAnswerError) {
    errorList.push({
      text: securityAnswerError.message,
      href: `#${securityAnswer}`
    })
  }

  return {
    errorSummary: { titleText: 'There is a problem', errorList },
    emailError,
    emailConfirmationError,
    securityQuestionError,
    securityAnswerError
  }
}

/**
 * @type { SecurityQuestion[]}
 */
export const securityQuestions = [
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
 * Get save and exit session flash key
 * @param { SaveAndExitParams } params
 */
export function getFlashKey(params) {
  const { state, slug } = params

  return `${state}_${slug}_save_and_exit_email`
}

/**
 *
 * @param {SaveAndExitParams} params
 * @param {SaveAndExitPayload} [payload]
 * @param {Error} [err]
 */
export function saveAndExitViewModel(params, payload, err) {
  const { state, slug } = params

  const {
    errorSummary,
    emailError,
    emailConfirmationError,
    securityQuestionError,
    securityAnswerError
  } = buildErrors(err)

  // Model fields
  const fields = {
    [email]: {
      id: email,
      name: email,
      label: {
        text: 'Your email address',
        classes: 'govuk-label--m',
        isPageHeading: false
      },
      hint: {
        text: 'Use the email address you want the link to go to'
      },
      value: payload?.email,
      errorMessage: emailError && { text: emailError.message }
    },
    [emailConfirmation]: {
      id: emailConfirmation,
      name: emailConfirmation,
      label: {
        text: 'Confirm your email address',
        classes: 'govuk-label--m',
        isPageHeading: false
      },
      value: payload?.emailConfirmation,
      errorMessage: emailConfirmationError && {
        text: emailConfirmationError.message
      }
    },
    [securityQuestion]: {
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
      errorMessage: securityQuestionError && {
        text: securityQuestionError.message
      }
    },
    [securityAnswer]: {
      id: securityAnswer,
      name: securityAnswer,
      label: {
        text: 'Your answer to the security question',
        classes: 'govuk-label--m'
      },
      value: payload?.securityAnswer,
      errorMessage: securityAnswerError && {
        text: securityAnswerError.message
      }
    }
  }

  // Model buttons
  const continueButton = {
    text: 'Save progress'
  }
  const cancelButton = {
    text: 'Cancel',
    classes: 'govuk-button--secondary',
    href: `/${state}/${slug}`
  }

  return { errorSummary, fields, buttons: { continueButton, cancelButton } }
}

/**
 * @typedef {object} SecurityQuestion
 * @property {string} text - the question text
 * @property {SecurityQuestionsEnum} value - the question type value
 */

/**
 * @typedef {Record<string, any>} SaveAndExitParams
 * @property {string} state - the preview/live state
 * @property {string} slug - the form slug
 */

/**
 * @typedef {object} SaveAndExitPayload
 * @property {string} email - email
 * @property {string} emailConfirmation - email confirmation
 * @property {string} securityQuestion - the security question
 * @property {string} securityAnswer - the security answer
 */

/**
 * @import { Request } from '@hapi/hapi'
 * @import { CacheService } from '@defra/forms-engine-plugin/cache-service.js'
 */
