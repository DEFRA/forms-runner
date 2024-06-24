import { type InputFieldsComponentsDef } from '@defra/forms-model'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import {
  getStateSchemaKeys,
  getFormSchemaKeys
} from '~/src/server/plugins/engine/components/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormData,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class EmailAddressField extends FormComponent {
  constructor(def: InputFieldsComponentsDef, model: FormModel) {
    super(def, model)
    this.schema.email = true
  }

  getFormSchemaKeys() {
    return getFormSchemaKeys(this.name, 'string', this)
  }

  getStateSchemaKeys() {
    return getStateSchemaKeys(this.name, 'string', this)
  }

  getViewModel(formData: FormData, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(formData, errors)

    viewModel.type = 'email'
    viewModel.autocomplete = 'email'

    return viewModel
  }
}
