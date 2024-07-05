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
  constructor(def: TelephoneNumberFieldComponent, model: FormModel) {
    super(def, model)

    const { options = {}, schema = {} } = def
    const pattern = schema.regex ? new RegExp(schema.regex) : PATTERN
    let formSchema = joi.string()

    if (options.required === false) {
      formSchema = formSchema.allow('').allow(null)
    }
    formSchema = formSchema
      .pattern(pattern)
      .message(def.options.customValidationMessage ?? DEFAULT_MESSAGE)
      .label(def.title.toLowerCase())

    if (schema.max) {
      formSchema = formSchema.max(schema.max)
    }

    if (schema.min) {
      formSchema = formSchema.min(schema.min)
    }

    this.formSchema = formSchema

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
