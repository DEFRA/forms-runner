import { type TelephoneNumberFieldComponent } from '@defra/forms-model'
import joi, { type StringSchema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

const PATTERN =
  /\s*(([+](\s?\d)([-\s]?\d)|0)?(\s?\d)([-\s]?\d){9}|[(](\s?\d)([-\s]?\d)+\s*[)]([-\s]?\d)+)\s*/

export class TelephoneNumberField extends FormComponent {
  declare options: TelephoneNumberFieldComponent['options']
  declare schema: TelephoneNumberFieldComponent['schema']
  declare formSchema: StringSchema

  constructor(def: TelephoneNumberFieldComponent, model: FormModel) {
    super(def, model)

    const { schema, options, title } = def

    let formSchema = joi
      .string()
      .trim()
      .label(title.toLowerCase())
      .pattern(PATTERN)

    if (options.required === false) {
      formSchema = formSchema.allow('').allow(null)
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message,
        'string.empty': message,
        'string.pattern.base': message
      })
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
