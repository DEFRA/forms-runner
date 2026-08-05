import os from 'node:os'

import {
  ConditionBuildError,
  InvalidFormDefinitionError,
  UnknownComponentTypeError,
  UnknownPageControllerError
} from '@defra/forms-engine-plugin/engine/errors.js'
import { getErrors } from '@defra/forms-model'

const MAX_TECHNICAL_LENGTH = 2000
const MAX_CAUSE_DEPTH = 5

/**
 * Redacts known filesystem prefixes by literal replacement. Deliberately not
 * heuristic path detection: literal replacement cannot misfire on non-path
 * text, and it removes the sensitive part (the container's filesystem layout).
 * @param {string} text
 * @returns {string}
 */
function redactKnownPrefixes(text) {
  return text.replaceAll(process.cwd(), '.').replaceAll(os.homedir(), '~')
}

/**
 * Builds the sanitized technical text: the error message plus its `cause`
 * chain. Never includes stack traces.
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
 * Checks for a Joi validation error (the engine throws the raw ValidationError
 * when a definition fails schema validation).
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
 * Friendly cause builders for known InvalidFormDefinitionError subclasses,
 * keyed by error class name (each class sets `this.name` to its own name).
 * Adding a new error type means adding one entry here. Subclasses without an
 * entry fall back to their own message in {@link interpretError}.
 * @type {Record<string, ((error: InvalidFormDefinitionError) => string) | undefined>}
 */
const friendlyCauseBuilders = {
  [ConditionBuildError.name]: (error) => {
    const { conditionName } = /** @type {ConditionBuildError} */ (error)
    return `The condition '${conditionName}' could not be understood. Check that it refers to the right question and answer option.`
  },
  [UnknownPageControllerError.name]: () =>
    'This form uses a page type this version of the service does not recognise.',
  [UnknownComponentTypeError.name]: (error) => {
    const { componentType } = /** @type {UnknownComponentTypeError} */ (error)
    return `This form uses a question type ('${componentType}') this version of the service does not recognise.`
  }
}

/**
 * Interprets an error raised while loading or rendering a form into
 * designer-friendly causes plus a sanitized technical message. Used by the
 * error pages plugin for preview requests only.
 * @param {Error} error
 * @returns {{ causes: string[], technical: string }}
 */
export function interpretError(error) {
  /** @type {string[]} */
  const causes = []

  if (isJoiError(error)) {
    for (const cause of getErrors(error)) {
      const path = Array.isArray(cause.detail?.path)
        ? ` (${cause.detail.path.join(' → ')})`
        : ''
      causes.push(`${cause.message}${path}`)
    }
  } else if (error instanceof InvalidFormDefinitionError) {
    const buildCause = friendlyCauseBuilders[error.name]
    causes.push(buildCause ? buildCause(error) : error.message)
  }

  return { causes, technical: buildTechnicalText(error) }
}
