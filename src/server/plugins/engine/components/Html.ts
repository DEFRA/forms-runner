import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class Html extends ComponentBase {
  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { options } = this

    const viewModel = {
      ...super.getViewModel(payload, errors),
      content: this.content
    }

    if ('condition' in options && options.condition) {
      viewModel.condition = options.condition
    }

    return viewModel
  }
}
