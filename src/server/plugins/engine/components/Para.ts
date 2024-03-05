import { ComponentBase } from './ComponentBase'
import type { FormData, FormSubmissionErrors } from '../types'

export class Para extends ComponentBase {
  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const options: any = this.options
    const viewModel = {
      ...super.getViewModel(formData, errors),
      content: this.content
    }

    if (options.condition) {
      viewModel.condition = options.condition
    }
    return viewModel
  }
}
