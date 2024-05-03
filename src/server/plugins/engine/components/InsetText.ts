import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type ViewModel } from '~/src/server/plugins/engine/components/types.js'
import {
  type FormData,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class InsetText extends ComponentBase {
  getViewModel(formData: FormData, errors: FormSubmissionErrors): ViewModel {
    return {
      ...super.getViewModel(formData, errors),
      content: this.content
    }
  }
}
