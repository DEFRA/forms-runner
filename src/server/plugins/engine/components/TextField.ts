import {
  type TextFieldComponent,
  type EmailAddressFieldComponent
} from '@defra/forms-model'
import joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class TextField extends FormComponent {
  formSchema

  constructor(
    def: TextFieldComponent | EmailAddressFieldComponent,
    model: FormModel
  ) {
    super(def, model)

    const { options, schema, title } = def

    let formSchema = joi
      .string()
      .default('')
      .required()
      .label(title.toLowerCase())

    if (options.required === false) {
      formSchema = formSchema.allow('').optional()
    }

    if (schema.max) {
      formSchema = formSchema.max(schema.max)
    }

    if (schema.min) {
      formSchema = formSchema.min(schema.min)
    }

    if (schema.regex) {
      formSchema = formSchema.pattern(new RegExp(schema.regex))
    }

    if (options.customValidationMessage) {
      formSchema = formSchema.messages({
        any: options.customValidationMessage
      })
    }

    this.formSchema = formSchema
    this.stateSchema = formSchema
    this.schema = schema
    this.options = options
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const options = this.options
    const viewModel = super.getViewModel(payload, errors)

    if ('autocomplete' in options) {
      viewModel.autocomplete = options.autocomplete
    }

    return viewModel
  }
}
