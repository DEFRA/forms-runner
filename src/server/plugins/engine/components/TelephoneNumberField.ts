import { type TelephoneNumberFieldComponent } from '@defra/forms-model'
import joi, { type StringSchema } from 'joi'

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
  declare options: TelephoneNumberFieldComponent['options']
  declare schema: TelephoneNumberFieldComponent['schema']
  declare formSchema: StringSchema

  constructor(def: TelephoneNumberFieldComponent, model: FormModel) {
    super(def, model)

    const { schema, options, title } = def

    const pattern = schema.regex ? new RegExp(schema.regex) : PATTERN
    let formSchema = joi.string()

    if (options.required === false) {
      formSchema = formSchema.allow('').allow(null)
    }

    formSchema = formSchema
      .pattern(pattern)
      .message(options.customValidationMessage ?? DEFAULT_MESSAGE)
      .label(title.toLowerCase())

    if (typeof schema.max === 'number') {
      formSchema = formSchema.max(schema.max)
    }

    if (typeof schema.min === 'number') {
      formSchema = formSchema.min(schema.min)
    }

    addClassOptionIfNone(options, 'govuk-input--width-20')

    this.formSchema = formSchema
    this.options = options
    this.schema = schema
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
