import { InputFieldsComponentsDef } from '@defra/forms-model'

import { FormModel } from '../models'
import { FormComponent } from './FormComponent'
import {
  getStateSchemaKeys,
  getFormSchemaKeys,
  addClassOptionIfNone
} from './helpers'
import type { FormData, FormSubmissionErrors } from '../types'

export class EmailAddressField extends FormComponent {
  constructor(def: InputFieldsComponentsDef, model: FormModel) {
    super(def, model)
    this.schema.email = true
    addClassOptionIfNone(this.options, 'govuk-input--width-20')
  }

  getFormSchemaKeys() {
    return getFormSchemaKeys(this.name, 'string', this)
  }

  getStateSchemaKeys() {
    return getStateSchemaKeys(this.name, 'string', this)
  }

  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const schema = this.schema
    const viewModel = super.getViewModel(formData, errors)

    if ('max' in schema && schema.max) {
      viewModel.attributes = {
        maxlength: schema.max
      }
    }

    viewModel.type = 'email'
    viewModel.autocomplete = 'email'

    return viewModel
  }
}
