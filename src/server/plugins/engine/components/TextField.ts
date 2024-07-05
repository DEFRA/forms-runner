import { type TextFieldComponent } from '@defra/forms-model'
import joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class TextField extends FormComponent {
  constructor(def: TextFieldComponent, model: FormModel) {
    super(def, model)

    const { options, schema = {} } = def
    this.options = options
    this.schema = schema

    let formSchema = joi.string().trim().required()
    if (options.required === false) {
      formSchema = formSchema.optional().allow('').allow(null)
    }

    formSchema = formSchema.label(title.toLowerCase())

    if (schema.max) {
      formSchema = formSchema.max(schema.max)
    }

    if (schema.min) {
      formSchema = formSchema.min(schema.min)
    }

    if (schema.regex) {
      const pattern = new RegExp(schema.regex)
      formSchema = formSchema.pattern(pattern)
    }

    if (options.customValidationMessage) {
      formSchema = formSchema.messages({
        any: options.customValidationMessage
      })
    }

    this.formSchema = formSchema
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const options = this.options
    const viewModel = super.getViewModel(payload, errors)

    if (options.autocomplete) {
      viewModel.autocomplete = options.autocomplete
    }

    return viewModel
  }
}
