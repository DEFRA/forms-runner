import { ListFormComponent } from './ListFormComponent.js'
import { SelectFieldComponent } from '@defra/forms-model'
import type {
  FormData,
  FormSubmissionErrors
} from '../../../plugins/engine/types.js'
import type { DataType } from './types.js'

export class SelectField extends ListFormComponent {
  dataType = 'list' as DataType
  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const options: SelectFieldComponent['options'] = this.options
    const viewModel = super.getViewModel(formData, errors)

    viewModel.items = [{ value: '' }, ...(viewModel.items ?? [])]
    if (options.autocomplete) {
      viewModel.attributes.autocomplete = options.autocomplete
    }
    return viewModel
  }
}
