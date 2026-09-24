import Joi from 'joi'

import { t } from '~/src/server/i18n/index.js'

/**
 * @param {string} fieldName
 * @param {string} message
 * @returns {Joi.ValidationError}
 */
export function createJoiError(fieldName, message) {
  return new Joi.ValidationError(
    message,
    [
      {
        message,
        path: [fieldName],
        type: 'custom',
        context: { key: fieldName, label: fieldName }
      }
    ],
    {}
  )
}

/**
 * Create a translator for Joi messages
 * @param {Record<string, Record<string, string>>} messageTranslations
 * @param {string} lang - the language
 */
export function createMessageTranslator(messageTranslations, lang) {
  /**
   * @type {MessageTranslator}
   */
  const fn = (fieldName, type) => {
    const fieldMessages = messageTranslations[fieldName]
    const messageKey = fieldMessages[type] ?? fieldMessages['*']

    return t(messageKey, lang)
  }

  return fn
}

/**
 * @param {ValidationError} error
 * @param {MessageTranslator} messageTranslator
 */
export function buildErrorDetails(error, messageTranslator) {
  return error.details.reduce((errors, validationErrorItem) => {
    const { context, type } = validationErrorItem

    const key = context?.key ?? 'general'

    return {
      ...errors,
      [key]: {
        text: messageTranslator(key, type),
        href: `#${key}`
      }
    }
  }, /** @type {ErrorDetails} */ ({}))
}

/**
 * @template T, S
 * @param { Request | Request<{ Params: S }> | Request<{ Payload: T }> | Request<{ Params: S, Payload: T }> } request
 * @param {ValidationSessionKey} flashKey
 * @param {MessageTranslator} messageTranslator
 * @param {Error} [error]
 */
export function addErrorsToSession(
  request,
  flashKey,
  messageTranslator,
  error
) {
  const { payload } = request

  flashErrorsToSession(request, payload, flashKey, messageTranslator, error)
}

/**
 * @template T, S
 * @param { Request | Request<{ Params: S }> | Request<{ Payload: T }> | Request<{ Params: S, Payload: T }> } request
 * @param {unknown} formValues
 * @param {ValidationSessionKey} flashKey
 * @param {MessageTranslator} messageTranslator
 * @param {Error} [error]
 */
export function flashErrorsToSession(
  request,
  formValues,
  flashKey,
  messageTranslator,
  error
) {
  const { yar } = request

  if (error && error instanceof Joi.ValidationError) {
    const formErrors = buildErrorDetails(error, messageTranslator)

    yar.flash(flashKey, {
      formErrors,
      formValues
    })
  }
}

/**
 * @param {Yar} yar
 * @param {keyof YarFlashes} errorKey
 */
export function getValidationErrorsFromSession(yar, errorKey) {
  const errors = /** @type {ValidationFailure<object>[] | undefined} */ (
    yar.flash(errorKey)
  )
  return errors?.at(0)
}

/**
 * @param {ErrorDetails | undefined} errorDetails
 * @param {string[]} [names] - Field names to filter error list by
 */
export function buildErrorList(errorDetails, names) {
  if (!errorDetails) {
    return []
  }

  return Object.entries(errorDetails)
    .filter(([key]) => names?.includes(key) ?? true)
    .map(([, message]) => message)
}

/**
 * Message translator callback
 * @callback MessageTranslator
 * @param {string} fieldName - the field name
 * @param {string} type - the joi error type
 * @returns {string}
 */

/**
 * @import { ErrorDetails, ValidationFailure } from '@defra/forms-model'
 * @import { Request } from '@hapi/hapi'
 * @import { ValidationSessionKey, Yar, YarFlashes } from '@hapi/yar'
 */

/**
 * @import { ValidationError } from 'joi'
 */
