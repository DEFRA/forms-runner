import { type AutocompleteFieldComponent } from '@defra/forms-model'

import {
  SelectField,
  type SelectPayload
} from '~/src/server/plugins/engine/components/SelectField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class AutocompleteField extends SelectField {
  declare options: AutocompleteFieldComponent['options']
  declare schema: AutocompleteFieldComponent['schema']

  constructor(def: AutocompleteFieldComponent, model: FormModel) {
    super(def, model)

    const { schema, options } = def

    this.options = options
    this.schema = schema
  }

  getViewModel(
    payload: FormPayload<SelectPayload>,
    errors?: FormSubmissionErrors
  ) {
    const viewModel = super.getViewModel(payload, errors)

    viewModel.formGroup ??= {}
    viewModel.formGroup.attributes = {
      'data-module': 'govuk-accessible-autocomplete'
    }

    return viewModel
  }
}
