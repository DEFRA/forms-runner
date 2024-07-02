import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type ViewModel } from '~/src/server/plugins/engine/components/types.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class InsetText extends ComponentBase {
  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors): ViewModel {
    return {
      ...super.getViewModel(payload, errors),
      content: this.content
    }
  }
}
