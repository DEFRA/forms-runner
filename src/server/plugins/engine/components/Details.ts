import { type DetailsComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class Details extends ComponentBase {
  declare options: DetailsComponent['options']
  declare schema: DetailsComponent['schema']
  content: DetailsComponent['content']

  constructor(def: DetailsComponent, model: FormModel) {
    super(def, model)

    const { content, schema, options } = def

    this.content = content
    this.options = options
    this.schema = schema
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { options } = this

    const viewModel = {
      ...super.getViewModel(payload, errors),
      summaryHtml: this.title,
      html: this.content
    }

    if (options.condition) {
      viewModel.condition = options.condition
    }

    return viewModel
  }
}
