import { type AutocompleteFieldComponent } from '@defra/forms-model'

import { SelectField } from '~/src/server/plugins/engine/components/SelectField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormData,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class AutocompleteField extends SelectField {
  options: AutocompleteFieldComponent['options']
  schema: AutocompleteFieldComponent['schema']

  constructor(def: AutocompleteFieldComponent, model: FormModel) {
    super(def, model)

    const { schema, options } = def

    this.options = options
    this.schema = schema
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

  getViewModel(formData: FormData, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(formData, errors)

    viewModel.formGroup ??= {}
    viewModel.formGroup.attributes = {
      'data-module': 'govuk-accessible-autocomplete'
    }

    return viewModel
  }
}
