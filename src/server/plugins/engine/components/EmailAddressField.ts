import { type EmailAddressFieldComponent } from '@defra/forms-model'
import joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class EmailAddressField extends FormComponent {
  declare options: EmailAddressFieldComponent['options']
  declare schema: EmailAddressFieldComponent['schema']

  constructor(def: EmailAddressFieldComponent, model: FormModel) {
    super(def, model)

    const { schema, options, title } = def

    let formSchema = joi
      .string()
      .email()
      .trim()
      .label(title.toLowerCase())
      .required()

    if (options.required === false) {
      formSchema = formSchema.allow('').optional()
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message,
        'string.empty': message,
        'string.email': message
      })
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
    this.schema = schema
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(payload, errors)

    viewModel.type = 'email'
    viewModel.autocomplete = 'email'

    return viewModel
  }
}
