import { type TelephoneNumberFieldComponent } from '@defra/forms-model'
import joi, { type Schema } from 'joi'

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
    let componentSchema = joi.string()

    if (options.required === false) {
      componentSchema = componentSchema.allow('').allow(null)
    }
    componentSchema = componentSchema
      .pattern(pattern)
      .message(def.options.customValidationMessage ?? DEFAULT_MESSAGE)
      .label(def.title.toLowerCase())

    if (schema.max) {
      componentSchema = componentSchema.max(schema.max)
    }

    if (schema.min) {
      componentSchema = componentSchema.min(schema.min)
    }

    this.schema = componentSchema

    addClassOptionIfNone(this.options, 'govuk-input--width-20')
  }

  getFormSchemaKeys() {
    return { [this.name]: this.schema as Schema }
  }

  getStateSchemaKeys() {
    return { [this.name]: this.schema as Schema }
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
