import os from 'node:os'

import {
  ConditionBuildError,
  InvalidFormDefinitionError,
  SchemaValidationError,
  UnknownComponentTypeError,
  UnknownPageControllerError
} from '@defra/forms-engine-plugin/engine/errors.js'
import {
  FormDefinitionError,
  FormDefinitionErrorType,
  getErrors
} from '@defra/forms-model'

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
 * Checks for a raw Joi validation error — thrown untyped by paths that
 * predate the InvalidFormDefinitionError family (e.g. metadata validation in
 * formsService). Definition schema failures arrive typed as
 * SchemaValidationError instead and never need this duck-typing.
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
 * Human-readable messages for the semantic definition-error codes that
 * getErrors derives from a Joi validation failure. Codes without an entry
 * fall back to the (lightly cleaned) Joi message.
 * @type {Record<string, string | undefined>}
 */
const messagesByCauseId = {
  [FormDefinitionError.UniquePageId]: 'Two pages have the same ID',
  [FormDefinitionError.UniquePagePath]: 'Two pages have the same path',
  [FormDefinitionError.UniquePageComponentId]: 'Two questions have the same ID',
  [FormDefinitionError.UniquePageComponentName]:
    'Two questions have the same name',
  [FormDefinitionError.UniqueSectionId]: 'Two sections have the same ID',
  [FormDefinitionError.UniqueSectionName]: 'Two sections have the same name',
  [FormDefinitionError.UniqueSectionTitle]: 'Two sections have the same title',
  [FormDefinitionError.UniqueListId]: 'Two lists have the same ID',
  [FormDefinitionError.UniqueListTitle]: 'Two lists have the same title',
  [FormDefinitionError.UniqueListName]: 'Two lists have the same name',
  [FormDefinitionError.UniqueConditionId]: 'Two conditions have the same ID',
  [FormDefinitionError.UniqueConditionDisplayName]:
    'Two conditions have the same name',
  [FormDefinitionError.UniqueListItemId]: 'Two list items have the same ID',
  [FormDefinitionError.UniqueListItemText]: 'Two list items have the same text',
  [FormDefinitionError.UniqueListItemValue]:
    'Two list items have the same value',
  [FormDefinitionError.RefPageCondition]:
    'A page refers to a condition that does not exist',
  [FormDefinitionError.RefConditionComponentId]:
    'A condition refers to a question that does not exist',
  [FormDefinitionError.RefConditionListId]:
    'A condition refers to a list that does not exist',
  [FormDefinitionError.RefConditionItemId]:
    'A condition refers to a list item that does not exist',
  [FormDefinitionError.RefConditionConditionId]:
    'A condition refers to another condition that does not exist',
  [FormDefinitionError.RefPageComponentList]:
    'A question refers to a list that does not exist',
  [FormDefinitionError.IncompatibleConditionComponentType]:
    'A condition is not compatible with the type of question it refers to',
  [FormDefinitionError.IncompatibleQuestionRegex]:
    "A question's answer format rule is invalid"
}

/**
 * Formats one getErrors cause as a human-readable sentence. Duplicate-value
 * causes carry the two clashing positions, reported 1-based.
 * @param {import('@defra/forms-model').FormDefinitionErrorCause} cause
 * @returns {string}
 */
function formatJoiCause(cause) {
  const friendly = messagesByCauseId[cause.id]

  if (!friendly) {
    return cause.message.replaceAll('"', "'")
  }

  const { detail } = cause

  if (
    cause.type === FormDefinitionErrorType.Unique &&
    detail &&
    'pos' in detail &&
    typeof detail.pos === 'number' &&
    'dupePos' in detail &&
    typeof detail.dupePos === 'number'
  ) {
    const positions = [detail.dupePos + 1, detail.pos + 1].sort((a, b) => a - b)
    return `${friendly} (entries ${positions[0]} and ${positions[1]})`
  }

  return friendly
}

/**
 * Cause builders for known InvalidFormDefinitionError subclasses,
 * keyed by error class name (each class sets `this.name` to its own name).
 * Adding a new error type means adding one entry here. Subclasses without an
 * entry fall back to their own message in {@link interpretError}.
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
 * Interprets an error raised while loading or rendering a form into
 * designer-friendly causes plus a sanitized technical message. Used by the
 * error pages plugin for preview requests only.
 * @param {Error} error
 * @returns {{ causes: string[], technical: string }}
 */
export function interpretError(error) {
  /** @type {string[]} */
  const causes = []

  const joiError =
    error instanceof SchemaValidationError
      ? /** @type {import('joi').ValidationError} */ (error.cause)
      : isJoiError(error)
        ? error
        : undefined

  if (joiError) {
    // Set-dedupe: distinct schema rules can format to identical sentences
    causes.push(...new Set(getErrors(joiError).map(formatJoiCause)))
  } else if (error instanceof InvalidFormDefinitionError) {
    const buildCause = causeBuildersByErrorName[error.name]
    causes.push(buildCause ? buildCause(error) : error.message)
  }

  return { causes, technical: buildTechnicalText(error) }
}
