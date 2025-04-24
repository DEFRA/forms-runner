/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// Declaration above is needed for: https://github.com/hapijs/joi/issues/3064

import joi, {
  type JoiExpression,
  type LanguageMessages,
  type LanguageMessagesExt,
  type ReferenceOptions,
  type ValidationOptions
} from 'joi'
import lowerFirst from 'lodash/lowerFirst.js'

const opts = {
  functions: {
    lowerFirst
  }
} as ReferenceOptions

/**
 * see @link https://joi.dev/api/?v=17.4.2#template-syntax for template syntax
 */
export const messageTemplate: Record<string, JoiExpression> = {
  required: joi.expression(
    'Enter {{lowerFirst(#label)}}',
    opts
  ) as JoiExpression,
  selectRequired: joi.expression(
    'Select {{lowerFirst(#label)}}',
    opts
  ) as JoiExpression,
  selectYesNoRequired: '{{#label}} - select yes or no',
  max: '{{#label}} must be {{#limit}} characters or less',
  min: '{{#label}} must be {{#limit}} characters or more',
  minMax: '{{#label}} must be between {{#min}} and {{#max}} characters',
  pattern: joi.expression(
    'Enter a valid {{lowerFirst(#label)}}',
    opts
  ) as JoiExpression,
  format: joi.expression(
    'Enter {{lowerFirst(#label)}} in the correct format',
    opts
  ) as JoiExpression,
  number: '{{#label}} must be a number',
  numberPrecision: '{{#label}} must have {{#limit}} or fewer decimal places',
  numberInteger: '{{#label}} must be a whole number',
  numberMin: '{{#label}} must be {{#limit}} or higher',
  numberMax: '{{#label}} must be {{#limit}} or lower',
  maxWords: '{{#label}} must be {{#limit}} words or fewer',

  // Nested fields use component title

  objectRequired: joi.expression('Enter {{#label}}', opts) as JoiExpression,
  objectMissing: joi.expression(
    '{{#title}} must include a {{lowerFirst(#label)}}',
    opts
  ) as JoiExpression,
  dateFormat: '{{#title}} must be a real date',
  dateMin: '{{#title}} must be the same as or after {{#limit}}',
  dateMax: '{{#title}} must be the same as or before {{#limit}}'
}

export const messages: LanguageMessagesExt = {
  'string.base': messageTemplate.required,
  'string.min': messageTemplate.min,
  'string.empty': messageTemplate.required,
  'string.max': messageTemplate.max,
  'string.email': messageTemplate.format,
  'string.pattern.base': messageTemplate.pattern,
  'string.maxWords': messageTemplate.maxWords,

  'number.base': messageTemplate.number,
  'number.precision': messageTemplate.numberPrecision,
  'number.integer': messageTemplate.numberInteger,
  'number.unsafe': messageTemplate.format,
  'number.min': messageTemplate.numberMin,
  'number.max': messageTemplate.numberMax,

  'object.required': messageTemplate.objectRequired,
  'object.and': messageTemplate.objectMissing,

  'any.only': messageTemplate.selectRequired,
  'any.required': messageTemplate.selectRequired,
  'any.empty': messageTemplate.required,

  'date.base': messageTemplate.dateFormat,
  'date.format': messageTemplate.dateFormat,
  'date.min': messageTemplate.dateMin,
  'date.max': messageTemplate.dateMax
}

export const messagesPre: LanguageMessages =
  messages as unknown as LanguageMessages

export const validationOptions: ValidationOptions = {
  abortEarly: false,
  messages: messagesPre,
  errors: {
    wrap: {
      array: false,
      label: false
    }
  }
}
