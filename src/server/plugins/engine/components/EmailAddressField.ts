import { type InputFieldsComponentsDef } from '@defra/forms-model'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class EmailAddressField extends FormComponent {
  constructor(def: InputFieldsComponentsDef, model: FormModel) {
    super(def, model)
    this.schema.email = true
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(payload, errors)

    viewModel.type = 'email'
    viewModel.autocomplete = 'email'

    return viewModel
  }
}
