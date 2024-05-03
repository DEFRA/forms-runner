import { type InputFieldsComponentsDef } from '@defra/forms-model'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import * as helpers from '~/src/server/plugins/engine/components/helpers.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormData,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

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

  getViewModel(formData: FormData, errors?: FormSubmissionErrors) {
    const viewModel = {
      ...super.getViewModel(formData, errors),
      type: 'time'
    }

    return viewModel
  }
}
