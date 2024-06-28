import { type EmailAddressFieldComponent } from '@defra/forms-model'

import { TextField } from './TextField.js'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class EmailAddressField extends TextField {
  constructor(def: EmailAddressFieldComponent, model: FormModel) {
    super(def, model)
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(payload, errors)

    viewModel.type = 'email'
    viewModel.autocomplete = 'email'

    return viewModel
  }
}
