import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import * as helpers from '~/src/server/plugins/engine/components/helpers.js'
import {
  type DataType,
  type ViewModel
} from '~/src/server/plugins/engine/components/types.js'
import {
  type FormData,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class FileUploadField extends FormComponent {
  dataType = 'file' as DataType
  getFormSchemaKeys() {
    return helpers.getFormSchemaKeys(this.name, 'string', this)
  }

  getStateSchemaKeys() {
    return helpers.getStateSchemaKeys(this.name, 'string', this)
  }

  get attributes() {
    return {
      accept: 'image/jpeg,image/gif,image/png,application/pdf'
    }
  }

  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const { options } = this
    const viewModel: ViewModel = {
      ...super.getViewModel(formData, errors),
      attributes: this.attributes
    }

    if ('multiple' in options && options.multiple) {
      viewModel.attributes.multiple = 'multiple'
    }

    return viewModel
  }
}
