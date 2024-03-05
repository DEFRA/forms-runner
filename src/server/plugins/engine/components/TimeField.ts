import { InputFieldsComponentsDef } from '@defra/forms-model'

import * as helpers from './helpers'
import { FormComponent } from './FormComponent'
import { FormModel } from '../models'
import { addClassOptionIfNone } from './helpers'
import type { FormData, FormSubmissionErrors } from '../types'

export class TimeField extends FormComponent {
  constructor(def: InputFieldsComponentsDef, model: FormModel) {
    super(def, model)
    addClassOptionIfNone(this.options, 'govuk-input--width-4')
  }

  getFormSchemaKeys() {
    return helpers.getFormSchemaKeys(this.name, 'string', this)
  }

  getStateSchemaKeys() {
    return helpers.getStateSchemaKeys(this.name, 'string', this)
  }

  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const viewModel = {
      ...super.getViewModel(formData, errors),
      type: 'time'
    }

    return viewModel
  }
}
