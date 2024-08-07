import { type NumberFieldComponent } from '@defra/forms-model'
import joi, { type NumberSchema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class NumberField extends FormComponent {
  declare options: NumberFieldComponent['options']
  declare schema: NumberFieldComponent['schema']
  declare formSchema: NumberSchema

  constructor(def: NumberFieldComponent, model: FormModel) {
    super(def, model)

    const { options, schema, title } = def

    let formSchema = joi.number().label(title.toLowerCase()).required()

    if (options.required === false) {
      formSchema = formSchema.allow('').optional()
    }

    if (typeof schema.min === 'number') {
      formSchema = formSchema.min(schema.min)
    }

    if (typeof schema.max === 'number') {
      formSchema = formSchema.max(schema.max)
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message,
        'number.base': message,
        'number.min': message,
        'number.max': message
      })
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
    this.schema = schema
  }

  getViewModel(
    payload: FormPayload<NumberPayload>,
    errors?: FormSubmissionErrors
  ) {
    const schema = this.schema
    const options = this.options

    const { suffix, prefix } = options

    const viewModelPrefix = { prefix: { text: prefix } }
    const viewModelSuffix = { suffix: { text: suffix } }

    const viewModel = {
      ...super.getViewModel(payload, errors),
      type: 'number',

      // ...False returns nothing, so only adds content when
      // the given options are present.
      ...(options.prefix && viewModelPrefix),
      ...(options.suffix && viewModelSuffix)
    }

    if (schema.precision) {
      viewModel.attributes.step = '0.' + '1'.padStart(schema.precision, '0')
    }

    return viewModel
  }
}

export type NumberPayload = Record<string, number | undefined>
export type NumberState = Record<string, number | null>
