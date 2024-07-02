import { type TelephoneNumberFieldComponent } from '@defra/forms-model'
import joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

const PATTERN = /^[0-9\\\s+()-]*$/
const DEFAULT_MESSAGE = 'Enter a telephone number in the correct format'

export class TelephoneNumberField extends FormComponent {
  schema: TelephoneNumberFieldComponent['schema']
  options: TelephoneNumberFieldComponent['options']

  constructor(def: TelephoneNumberFieldComponent, model: FormModel) {
    super(def, model)

    const { schema, options, title } = def
    const { min, max, regex } = schema

    let formSchema = joi
      .string()
      .default('')
      .pattern(regex ? new RegExp(regex) : PATTERN)
      .message(options.customValidationMessage ?? DEFAULT_MESSAGE)
      .label(title.toLowerCase())
      .required()

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

    this.formSchema = formSchema
    this.stateSchema = formSchema
    this.schema = schema
    this.options = options

    addClassOptionIfNone(this.options, 'govuk-input--width-20')
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = {
      ...super.getViewModel(payload, errors),
      type: 'tel',
      autocomplete: 'tel'
    }

    return viewModel
  }
}
