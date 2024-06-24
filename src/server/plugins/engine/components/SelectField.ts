import { type SelectFieldComponent } from '@defra/forms-model'

import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { type DataType } from '~/src/server/plugins/engine/components/types.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class SelectField extends ListFormComponent {
  dataType = 'list' as DataType
  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const options: SelectFieldComponent['options'] = this.options
    const viewModel = super.getViewModel(payload, errors)

    viewModel.items = [{ value: '' }, ...(viewModel.items ?? [])]
    if (options.autocomplete) {
      viewModel.attributes.autocomplete = options.autocomplete
    }
    return viewModel
  }
}
