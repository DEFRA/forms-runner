import { type InsetTextComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

export class InsetText extends ComponentBase {
  content: InsetTextComponent['content']

  constructor(def: InsetTextComponent, model: FormModel) {
    super(def, model)

    const { content } = def

    this.content = content
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const { content } = this

    const viewModel = super.getViewModel(payload, errors)

    return {
      ...viewModel,
      content
    }
  }
}
