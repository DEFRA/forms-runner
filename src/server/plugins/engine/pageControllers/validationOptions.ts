import { type LanguageMessages, type ValidationOptions } from 'joi'
/**
 * see @link https://joi.dev/api/?v=17.4.2#template-syntax for template syntax
 */
export const messageTemplate = {
  required: 'Enter {{#label}}',
  selectRequired: 'Select {{#label}}',
  max: '{{#label}} must be {{#limit}} characters or less',
  min: '{{#label}} must be {{#limit}} characters or more',
  pattern: 'Enter a valid {{#label}}',
  email: 'Enter {{#label}} in the correct format',
  number: '{{#label}} must be a number',
  numberMin: '{{#label}} must be {{#limit}} or higher',
  numberMax: '{{#label}} must be {{#limit}} or lower',
  maxWords: '{{#label}} must be {{#limit}} words or fewer',
  dateRequired: '{{#label}} must be a real date',
  dateFormat: '{{#label}} must be a real date',
  dateMin: '{{#label}} must be the same as or after {{#limit}}',
  dateMax: '{{#label}} must be the same as or before {{#limit}}'
}

export const messages: LanguageMessages = {
  'string.base': messageTemplate.required,
  'string.min': messageTemplate.min,
  'string.empty': messageTemplate.required,
  'string.max': messageTemplate.max,
  'string.email': messageTemplate.email,
  'string.pattern.base': messageTemplate.pattern,
  'string.maxWords': messageTemplate.maxWords,

  'number.base': messageTemplate.number,
  'number.min': messageTemplate.numberMin,
  'number.max': messageTemplate.numberMax,

  'any.only': messageTemplate.selectRequired,
  'any.required': messageTemplate.selectRequired,
  'any.empty': messageTemplate.required,

  'date.base': messageTemplate.dateRequired,
  'date.format': messageTemplate.dateFormat,
  'date.min': messageTemplate.dateMin,
  'date.max': messageTemplate.dateMax
}

export const validationOptions: ValidationOptions = {
  abortEarly: false,
  messages,
  dateFormat: 'iso',
  errors: {
    wrap: {
      label: false
    }
  }
}
