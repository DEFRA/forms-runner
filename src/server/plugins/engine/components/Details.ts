import { type DetailsComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import {
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

export class Details extends ComponentBase {
  declare options: DetailsComponent['options']
  content: DetailsComponent['content']

  constructor(
    def: DetailsComponent,
    props: ConstructorParameters<typeof ComponentBase>[1]
  ) {
    super(def, props)

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
