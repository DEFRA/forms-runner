import { type NumberFieldComponent } from '@defra/forms-model'
import joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class NumberField extends FormComponent {
  declare options: NumberFieldComponent['options']
  declare schema: NumberFieldComponent['schema']

  constructor(def: NumberFieldComponent, model: FormModel) {
    super(def, model)

    const { options, schema, title } = def

    let formSchema = joi.number().label(title.toLowerCase())

    if (typeof schema.min === 'number' && typeof schema.max === 'number') {
      formSchema = formSchema.$
    }

    if (typeof schema.min === 'number') {
      formSchema = formSchema.min(schema.min)
    }

    if (typeof schema.max === 'number') {
      formSchema = formSchema.max(schema.max)
    }

    if (options.customValidationMessage) {
      formSchema = formSchema.rule({
        message: options.customValidationMessage
      })
    }

    if (options.required === false) {
      const optionalSchema = joi
        .alternatives<string | number>()
        .try(
          joi.string().allow(null).allow('').default('').optional(),
          formSchema
        )

      this.formSchema = optionalSchema
    } else {
      this.formSchema = formSchema
    }

    this.options = options
    this.schema = schema
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

  getDisplayStringFromState(state: FormSubmissionState) {
    return state[this.name] || state[this.name] === 0
      ? state[this.name].toString()
      : undefined
  }
}
