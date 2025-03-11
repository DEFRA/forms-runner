import { type TelephoneNumberFieldComponent } from '@defra/forms-model'
import joi, { type StringSchema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers.js'
import {
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

const PATTERN = /^[0-9\\\s+()-]*$/

export class TelephoneNumberField extends FormComponent {
  declare options: TelephoneNumberFieldComponent['options']
  declare formSchema: StringSchema
  declare stateSchema: StringSchema

  constructor(
    def: TelephoneNumberFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { options, title } = def

    let formSchema = joi
      .string()
      .trim()
      .pattern(PATTERN)
      .label(title)
      .required()

    if (options.required === false) {
      formSchema = formSchema.allow('')
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message,
        'string.empty': message,
        'string.pattern.base': message
      })
    } else if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    }

    addClassOptionIfNone(options, 'govuk-input--width-20')

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const viewModel = super.getViewModel(payload, errors)
    const { attributes } = viewModel

    attributes.autocomplete = 'tel'

    return {
      ...viewModel,
      type: 'tel'
    }
  }
}
