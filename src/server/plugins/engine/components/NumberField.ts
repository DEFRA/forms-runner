import { type NumberFieldComponent } from '@defra/forms-model'
import joi, { type CustomValidator, type NumberSchema } from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class NumberField extends FormComponent {
  declare options: NumberFieldComponent['options']
  declare schema: NumberFieldComponent['schema']
  declare formSchema: NumberSchema
  declare stateSchema: NumberSchema

  constructor(def: NumberFieldComponent, model: FormModel) {
    super(def, model)

    const { options, schema, title } = def

    let formSchema = joi
      .number()
      .custom(getValidatorPrecision(this))
      .label(title.toLowerCase())
      .required()

    if (options.required === false) {
      formSchema = formSchema.allow('')
    } else {
      formSchema = formSchema.empty('').messages({
        'any.required': messageTemplate.required
      })
    }

    if (typeof schema.min === 'number') {
      formSchema = formSchema.min(schema.min)
    }

    if (typeof schema.max === 'number') {
      formSchema = formSchema.max(schema.max)
    }

    if (typeof schema.precision === 'number' && schema.precision <= 0) {
      formSchema = formSchema.integer()
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message,
        'number.base': message,
        'number.precision': message,
        'number.integer': message,
        'number.min': message,
        'number.max': message
      })
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
    this.schema = schema
  }

  getFormValueFromState(state: FormSubmissionState) {
    const value = super.getFormValueFromState(state)
    return this.isValue(value) ? value : undefined
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { options, schema } = this

    const viewModel = super.getViewModel(payload, errors)
    let { attributes, prefix, suffix, value } = viewModel

    if (schema.precision) {
      attributes.step = '0.' + '1'.padStart(schema.precision, '0')
    }

    if (options.prefix) {
      prefix = {
        text: options.prefix
      }
    }

    if (options.suffix) {
      suffix = {
        text: options.suffix
      }
    }

    // Allow any `toString()`-able value so non-numeric
    // values are shown alongside their error messages
    if (!isFormValue(value)) {
      value = undefined
    }

    return {
      ...viewModel,
      attributes,
      prefix,
      suffix,
      type: 'number',
      value
    }
  }

  isValue(value?: FormStateValue | FormState) {
    return NumberField.isNumber(value)
  }

  static isNumber(value?: FormStateValue | FormState): value is number {
    return typeof value === 'number'
  }
}

export function getValidatorPrecision(component: NumberField) {
  const validator: CustomValidator = (value: number, helpers) => {
    const { options, schema } = component

    const { customValidationMessage: custom } = options
    const { precision: limit } = schema

    if (!limit || limit <= 0) {
      return value
    }

    const validationSchema = joi
      .number()
      .precision(limit)
      .prefs({ convert: false })

    try {
      return joi.attempt(value, validationSchema)
    } catch {
      return custom
        ? helpers.message({ custom }, { limit })
        : helpers.error('number.precision', { limit })
    }
  }

  return validator
}
