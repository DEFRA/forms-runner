import { type HtmlComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class Html extends ComponentBase {
  declare options: HtmlComponent['options']
  declare schema: HtmlComponent['schema']

  constructor(def: HtmlComponent, model: FormModel) {
    super(def, model)

    const { schema, options } = def

    this.options = options
    this.schema = schema
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { options } = this

    const viewModel = {
      ...super.getViewModel(payload, errors),
      content: this.content
    }

    if (options.condition) {
      viewModel.condition = options.condition
    }

    return viewModel
  }
}
