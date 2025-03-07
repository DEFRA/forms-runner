import { type NumberFieldComponent } from '@defra/forms-model'
import joi, { type CustomValidator, type NumberSchema } from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class NumberField extends FormComponent {
  declare options: NumberFieldComponent['options']
  declare schema: NumberFieldComponent['schema']
  declare formSchema: NumberSchema
  declare stateSchema: NumberSchema

  constructor(
    def: NumberFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { options, schema, title } = def

    let formSchema = joi
      .number()
      .custom(getValidatorPrecision(this))
      .label(title)
      .required()

    if (options.required === false) {
      formSchema = formSchema.allow('')
    } else {
      const messages = options.customValidationMessages

      formSchema = formSchema.empty('').messages({
        'any.required': messages?.['any.required'] ?? messageTemplate.required
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
    } else if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
    this.schema = schema
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { name } = this
    return this.getFormValue(state[name])
  }

  getFormValue(value?: FormStateValue | FormState) {
    return this.isValue(value) ? value : undefined
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const { options, schema } = this

    const viewModel = super.getViewModel(payload, errors)
    let { attributes, prefix, suffix, value } = viewModel

    if (typeof schema.precision === 'undefined' || schema.precision <= 0) {
      // If precision isn't provided or provided and
      // less than or equal to 0, use numeric inputmode
      attributes.inputmode = 'numeric'
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
