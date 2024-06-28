import { type NumberFieldComponent } from '@defra/forms-model'
import joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class NumberField extends FormComponent {
  schema: NumberFieldComponent['schema']
  options: NumberFieldComponent['options']

  constructor(def: NumberFieldComponent, model: FormModel) {
    super(def, model)

    const { schema, options, title } = def
    const { min, max } = schema

    let formSchema = joi
      .number()
      .default('')
      .required()
      .label(title.toLowerCase())

    if (options.required === false) {
      formSchema = formSchema.allow('').optional()
    }

    if (typeof min === 'number' && typeof min === 'number') {
      formSchema = formSchema.ruleset
    }

    if (typeof min === 'number') {
      formSchema = formSchema.min(min)
    }

    if (typeof max === 'number') {
      formSchema = formSchema.max(max)
    }

    if (
      'customValidationMessage' in options &&
      options.customValidationMessage
    ) {
      formSchema = formSchema.rule({
        message: options.customValidationMessage
      })
    }

    this.formSchema = formSchema
    this.stateSchema = formSchema
    this.schema = schema
    this.options = options
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
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
