import { TelephoneNumberFieldComponent } from '@defra/forms-model'

import { FormComponent } from './FormComponent.js'
import { FormModel } from '../models/index.js'
import { addClassOptionIfNone } from './helpers.js'
import joi, { Schema } from 'joi'
import type { FormData, FormSubmissionErrors } from '../types.js'

const PATTERN = /^[0-9\\\s+()-]*$/
const DEFAULT_MESSAGE = 'Enter a telephone number in the correct format'
export class TelephoneNumberField extends FormComponent {
  constructor(def: TelephoneNumberFieldComponent, model: FormModel) {
    super(def, model)

    const { options = {}, schema = {} } = def
    const pattern = schema.regex ? new RegExp(schema.regex) : PATTERN
    let componentSchema = joi.string()

    if (options.required === false) {
      componentSchema = componentSchema.allow('').allow(null)
    }
    componentSchema = componentSchema
      .pattern(pattern)
      .message(def.options?.customValidationMessage ?? DEFAULT_MESSAGE)
      .label(def.title.toLowerCase())

    if (schema.max) {
      componentSchema = componentSchema.max(schema.max)
    }

    if (schema.min) {
      componentSchema = componentSchema.min(schema.min)
    }

    this.schema = componentSchema

    addClassOptionIfNone(this.options, 'govuk-input--width-10')
  }

  getFormSchemaKeys() {
    return { [this.name]: this.schema as Schema }
  }

  getStateSchemaKeys() {
    return { [this.name]: this.schema as Schema }
  }

  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const viewModel = {
      ...super.getViewModel(formData, errors),
      type: 'tel',
      autocomplete: 'tel'
    }

    return viewModel
  }
}
