import os from 'node:os'

import {
  ConditionBuildError,
  InvalidFormDefinitionError,
  SchemaValidationError,
  UnknownComponentTypeError,
  UnknownPageControllerError
} from '@defra/forms-engine-plugin/engine/errors.js'
import { formErrorsToMessages, getErrors } from '@defra/forms-model'

import { MetadataValidationError } from '~/src/server/services/errors.js'

const MAX_TECHNICAL_LENGTH = 2000
const MAX_CAUSE_DEPTH = 5

/**
 * Hides server file paths. Only the two prefixes we know about are replaced
 * (the app directory and the home directory) — plain text substitution, so
 * text that is not a path is never touched.
 * @param {string} text
 * @returns {string}
 */
function redactBasePaths(text) {
  return text.replaceAll(process.cwd(), '.').replaceAll(os.homedir(), '~')
}

/**
 * Builds the text for the "Technical details" block: the error message,
 * followed by the messages of the errors that caused it. Never includes
 * stack traces.
 * @param {Error} error
 * @returns {string}
 */
function buildTechnicalText(error) {
  const parts = [error.message]

  let cause = error.cause
  let depth = 0

  while (cause instanceof Error && depth < MAX_CAUSE_DEPTH) {
    parts.push(`Caused by: ${cause.message}`)
    cause = cause.cause
    depth++
  }

  const text = redactBasePaths(parts.join('\n'))

  return text.length > MAX_TECHNICAL_LENGTH
    ? `${text.slice(0, MAX_TECHNICAL_LENGTH)}… (truncated)`
    : text
}

/**
 * One message builder per known error type, keyed by the error's class name.
 * To support a new error type, add an entry here. Errors without an entry
 * fall back to their own message.
 * @type {Record<string, ((error: InvalidFormDefinitionError) => string) | undefined>}
 */
const causeBuildersByErrorName = {
  [ConditionBuildError.name]: (error) => {
    const { conditionName } = /** @type {ConditionBuildError} */ (error)
    return `The condition '${conditionName}' is invalid. Check that it refers to the right question and answer option.`
  },
  [UnknownPageControllerError.name]: () =>
    'This form uses a page type this version of the service does not recognise.',
  [UnknownComponentTypeError.name]: (error) => {
    const { componentType } = /** @type {UnknownComponentTypeError} */ (error)
    return `This form uses a question type ('${componentType}') this version of the service does not recognise.`
  }
}

/**
 * One message per validation failure in the form definition. A Set removes
 * repeats, because several schema rules can produce the same message.
 * @param {import('joi').ValidationError} joiError
 * @returns {string[]}
 */
function buildDefinitionCauses(joiError) {
  return [
    ...new Set(
      getErrors(joiError).map((cause) => formErrorsToMessages[cause.id])
    )
  ]
}

/**
 * Works out the human-readable reasons an error happened.
 * @param {Error} error
 * @returns {string[]}
 */
function buildCauses(error) {
  // Invalid form definitions arrive wrapped, with the Joi error as the cause
  if (error instanceof SchemaValidationError) {
    return buildDefinitionCauses(error.cause)
  }

  // The metadata check in formsService throws this; the raw messages are too
  // technical to show as causes, so point the author at the right place. The
  // field-level detail still appears in the technical block.
  if (error instanceof MetadataValidationError) {
    return [
      "Some of the form's overview details are invalid. Go back to the form overview and check details such as contact information and email addresses."
    ]
  }

  if (error instanceof InvalidFormDefinitionError) {
    const buildCause = causeBuildersByErrorName[error.name]
    return [buildCause ? buildCause(error) : error.message]
  }

  return []
}

/**
 * Turns an error raised while loading a form into human-readable causes plus
 * a short technical description. Used by the preview error page only.
 * @param {Error} error
 * @returns {{ causes: string[], technical: string }}
 */
export function interpretError(error) {
  return { causes: buildCauses(error), technical: buildTechnicalText(error) }
}

/**
 * Whether the error is a known form-configuration problem (form definition
 * or form metadata). Anything else — an outage, a bug — must not be
 * presented as a problem with the form.
 * @param {Error} error
 * @returns {boolean}
 */
export function isFormConfigurationError(error) {
  return (
    error instanceof InvalidFormDefinitionError ||
    error instanceof MetadataValidationError
  )
}
