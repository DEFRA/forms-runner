import { type SelectFieldComponent } from '@defra/forms-model'

import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { type DataType } from '~/src/server/plugins/engine/components/types.js'
import {
  type FormData,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class SelectField extends ListFormComponent {
  dataType = 'list' as DataType
  getViewModel(formData: FormData, errors?: FormSubmissionErrors) {
    const options: SelectFieldComponent['options'] = this.options
    const viewModel = super.getViewModel(formData, errors)

    viewModel.items = [{ value: '' }, ...(viewModel.items ?? [])]
    if (options.autocomplete) {
      viewModel.attributes.autocomplete = options.autocomplete
    }
    return viewModel
  }
}
