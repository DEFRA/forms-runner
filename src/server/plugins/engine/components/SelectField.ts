import {
  type AutocompleteFieldComponent,
  type SelectFieldComponent
} from '@defra/forms-model'

import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class SelectField extends ListFormComponent {
  options:
    | SelectFieldComponent['options']
    | AutocompleteFieldComponent['options']

  schema: SelectFieldComponent['schema']

  constructor(
    def: SelectFieldComponent | AutocompleteFieldComponent,
    model: FormModel
  ) {
    super(def, model)

    const { schema, options } = def

    this.options = options
    this.schema = schema
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { options } = this

    const viewModel = super.getViewModel(payload, errors)
    viewModel.items = [{ value: '' }, ...(viewModel.items ?? [])]

    if ('autocomplete' in options) {
      viewModel.attributes.autocomplete = options.autocomplete
    }

    return viewModel
  }
}
