import { type HtmlComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import {
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

export class Html extends ComponentBase {
  declare options: HtmlComponent['options']
  content: HtmlComponent['content']

  constructor(
    def: HtmlComponent,
    props: ConstructorParameters<typeof ComponentBase>[1]
  ) {
    super(def, props)

    const { content, options } = def

    this.content = content
    this.options = options
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
