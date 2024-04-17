import { ComponentBase } from './ComponentBase.js'
import type { ViewModel } from './types.js'
import type { FormData, FormSubmissionErrors } from '../types.js'

export class InsetText extends ComponentBase {
  getViewModel(formData: FormData, errors: FormSubmissionErrors): ViewModel {
    return {
      ...super.getViewModel(formData, errors),
      content: this.content
    }
  }
}
