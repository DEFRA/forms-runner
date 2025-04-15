import { type EmailAddressFieldComponent } from '@defra/forms-model'
import joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

export class EmailAddressField extends FormComponent {
  declare options: EmailAddressFieldComponent['options']

  constructor(
    def: EmailAddressFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { options } = def

    let formSchema = joi.string().email().trim().label(this.label).required()

    if (options.required === false) {
      formSchema = formSchema.allow('')
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message,
        'string.empty': message,
        'string.email': message
      })
    } else if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const viewModel = super.getViewModel(payload, errors)
    const { attributes } = viewModel

    attributes.autocomplete = 'email'

    return {
      ...viewModel,
      type: 'email'
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [
        { type: 'required', template: messageTemplate.required },
        { type: 'format', template: messageTemplate.format }
      ],
      advancedSettingsErrors: []
    }
  }
}
