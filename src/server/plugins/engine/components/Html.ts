import { type HtmlComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class Html extends ComponentBase {
  declare options: HtmlComponent['options']
  content: HtmlComponent['content']

  constructor(def: HtmlComponent, model: FormModel) {
    super(def, model)

    const { content, options } = def

    this.content = content
    this.options = options
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = {
      ...super.getViewModel(payload, errors),
      content: this.content
    }

    return viewModel
  }
}
