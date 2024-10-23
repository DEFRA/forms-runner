import { type DetailsComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormSubmissionErrors
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

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = {
      ...super.getViewModel(payload, errors),
      summaryHtml: this.title,
      html: this.content
    }

    return viewModel
  }
}
