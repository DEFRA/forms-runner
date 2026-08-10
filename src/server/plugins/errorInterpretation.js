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

  const text = parts.join('\n')

  return text.length > MAX_TECHNICAL_LENGTH
    ? `${text.slice(0, MAX_TECHNICAL_LENGTH)}… (truncated)`
    : text
}

/**
 * One cause builder per known error type, keyed by the error's class name.
 * To support a new error type, add an entry here. Errors without an entry
 * fall back to their own message.
 * @type {Record<string, ((error: InvalidFormDefinitionError) => string | ErrorCause) | undefined>}
 */
const causeBuildersByErrorName = {
  [ConditionBuildError.name]: (error) => {
    const { conditionName } = /** @type {ConditionBuildError} */ (error)
    return {
      text: `The condition "${conditionName}" isn't configured correctly. Open the condition and check that:`,
      items: [
        'the question it refers to still exists',
        'the correct answer option is selected',
        'the condition has been completed and saved'
      ]
    }
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
 * @typedef {object} ErrorCause
 * @property {string} text - summary sentence
 * @property {string} [itemsIntro] - optional lead-in shown before the bullets
 * @property {string[]} [items] - optional bullet points shown under the text
 */

/**
 * Works out the human-readable reasons an error happened.
 * @param {Error} error
 * @returns {(string | ErrorCause)[]}
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
      {
        text: "Some of the form's details are not configured correctly. Go back to the form overview and check details such as contact information and email addresses.",
        itemsIntro: 'Check that:',
        items: [
          'notification email addresses are entered correctly',
          'contact information has been completed',
          'any recent changes to the form details have been saved'
        ]
      }
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
 * @returns {{ causes: ErrorCause[], technical: string }}
 */
export function interpretError(error) {
  const causes = buildCauses(error).map((cause) =>
    typeof cause === 'string' ? { text: cause } : cause
  )

  return { causes, technical: buildTechnicalText(error) }
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
