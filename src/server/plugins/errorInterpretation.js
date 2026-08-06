import os from 'node:os'

import {
  ConditionBuildError,
  InvalidFormDefinitionError,
  SchemaValidationError,
  UnknownComponentTypeError,
  UnknownPageControllerError
} from '@defra/forms-engine-plugin/engine/errors.js'
import { formErrorsToMessages, getErrors } from '@defra/forms-model'

const MAX_TECHNICAL_LENGTH = 2000
const MAX_CAUSE_DEPTH = 5

/**
 * Hides server file paths. Only the two prefixes we know about are replaced
 * (the app directory and the home directory) — plain text substitution, so
 * text that is not a path is never touched.
 * @param {string} text
 * @returns {string}
 */
function redactKnownPrefixes(text) {
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

  const text = redactKnownPrefixes(parts.join('\n'))

  return text.length > MAX_TECHNICAL_LENGTH
    ? `${text.slice(0, MAX_TECHNICAL_LENGTH)}… (truncated)`
    : text
}

/**
 * Checks whether an error is a raw Joi validation error. Only the metadata
 * check in formsService still throws these — invalid form definitions arrive
 * as SchemaValidationError instead.
 * @param {Error} error
 * @returns {error is import('joi').ValidationError}
 */
function isJoiError(error) {
  return (
    'isJoi' in error &&
    'details' in error &&
    error.isJoi === true &&
    Array.isArray(error.details)
  )
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
 * The metadata schema has no friendly-message codes (formErrorsToMessages
 * only covers the definition) and its raw messages are too technical to show
 * as causes, so point the author at the right place instead. The field-level
 * detail still appears in the technical block.
 * @returns {string[]}
 */
function buildMetadataCauses() {
  return [
    "Some of the form's overview details are invalid. Go back to the form overview and check details such as contact information and email addresses."
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

  // Raw Joi errors only come from the metadata check in formsService
  if (isJoiError(error)) {
    return buildMetadataCauses()
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
