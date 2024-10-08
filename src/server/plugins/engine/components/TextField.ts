import {
  type EmailAddressFieldComponent,
  type TextFieldComponent
} from '@defra/forms-model'
import joi, { type StringSchema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class TextField extends FormComponent {
  declare options:
    | TextFieldComponent['options']
    | EmailAddressFieldComponent['options']

  declare schema: TextFieldComponent['schema']

  declare formSchema: StringSchema

  constructor(
    def: TextFieldComponent | EmailAddressFieldComponent,
    model: FormModel
  ) {
    super(def, model)

    const { options, title } = def
    const schema = 'schema' in def ? def.schema : {}

    let formSchema = joi.string().trim().label(title.toLowerCase()).required()

    if (options.required === false) {
      formSchema = formSchema.allow('')
    }

    if (typeof schema.length !== 'number') {
      if (typeof schema.max === 'number') {
        formSchema = formSchema.max(schema.max)
      }

      if (typeof schema.min === 'number') {
        formSchema = formSchema.min(schema.min)
      }
    } else {
      formSchema = formSchema.length(schema.length)
    }

    if (schema.regex) {
      const pattern = new RegExp(schema.regex)
      formSchema = formSchema.pattern(pattern)
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message,
        'string.empty': message,
        'string.max': message,
        'string.min': message,
        'string.length': message,
        'string.pattern.base': message
      })
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
    this.schema = schema
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
