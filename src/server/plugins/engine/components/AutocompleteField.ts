import { type AutocompleteFieldComponent } from '@defra/forms-model'

import { SelectField } from '~/src/server/plugins/engine/components/SelectField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class AutocompleteField extends SelectField {
  declare options: AutocompleteFieldComponent['options']

  constructor(def: AutocompleteFieldComponent, model: FormModel) {
    super(def, model)

    const { options } = def
    let { formSchema } = this

    if (options.required !== false) {
      formSchema = formSchema.messages({
        'any.only': messageTemplate.required,
        'any.required': messageTemplate.required
      })
    }

    this.options = options
    this.formSchema = formSchema
  }

  getDisplayStringFromState(state: FormSubmissionState): string {
    const { name, items } = this
    const value = state[name]
    if (Array.isArray(value)) {
      return items
        .filter((item) => value.includes(item.value))
        .map((item) => item.text)
        .join(', ')
    }
    const item = items.find((item) => String(item.value) === String(value))
    return item?.text ?? ''
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(payload, errors)

    viewModel.formGroup ??= {}
    viewModel.formGroup.attributes = {
      'data-module': 'govuk-accessible-autocomplete'
    }

    return viewModel
  }
}
