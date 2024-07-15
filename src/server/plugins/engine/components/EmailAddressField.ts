import { type EmailAddressFieldComponent } from '@defra/forms-model'

import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class EmailAddressField extends TextField {
  declare options: EmailAddressFieldComponent['options']
  declare schema: EmailAddressFieldComponent['schema']

  constructor(def: EmailAddressFieldComponent, model: FormModel) {
    super(def, model)

    const { schema, options } = def

    this.formSchema = this.formSchema.email()
    this.options = options
    this.schema = schema
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(payload, errors)

    viewModel.type = 'email'
    viewModel.autocomplete = 'email'

    return viewModel
  }
}
