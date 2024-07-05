import { type TextFieldComponent } from '@defra/forms-model'
import joi, { type Schema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class TextField extends FormComponent {
  formSchema
  stateSchema

  constructor(def: TextFieldComponent, model: FormModel) {
    super(def, model)

    const { options, schema = {} } = def
    this.options = options
    this.schema = schema

    let componentSchema = joi.string().trim().required()
    if (options.required === false) {
      componentSchema = componentSchema.optional().allow('').allow(null)
    }

    componentSchema = componentSchema.label(
      (def.title.en ?? def.title ?? def.name).toLowerCase()
    )

    if (schema.max) {
      componentSchema = componentSchema.max(schema.max)
    }

    if (schema.min) {
      componentSchema = componentSchema.min(schema.min)
    }

    if (schema.regex) {
      const pattern = new RegExp(schema.regex)
      componentSchema = componentSchema.pattern(pattern)
    }

    if (options.customValidationMessage) {
      componentSchema = componentSchema.messages({
        any: options.customValidationMessage
      })
    }

    this.formSchema = componentSchema
  }

  getFormSchemaKeys() {
    return { [this.name]: this.formSchema as Schema }
  }

  getStateSchemaKeys() {
    return { [this.name]: this.formSchema as Schema }
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
