import { type DetailsComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

export class Details extends ComponentBase {
  declare options: DetailsComponent['options']
  content: DetailsComponent['content']

  constructor(def: DetailsComponent, model: FormModel) {
    super(def, model)

    const { content, options } = def

    this.content = content
    this.options = options
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const { content, title } = this

    const viewModel = super.getViewModel(payload, errors)

    return {
      ...viewModel,
      html: content,
      summaryHtml: title
    }
  }
}
