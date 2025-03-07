import { type MarkdownComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'

export class Markdown extends ComponentBase {
  declare options: MarkdownComponent['options']
  content: MarkdownComponent['content']

  constructor(
    def: MarkdownComponent,
    props: ConstructorParameters<typeof ComponentBase>[1]
  ) {
    super(def, props)

    const { content, options } = def

    this.content = content
    this.options = options
  }

  getViewModel() {
    const { content, viewModel } = this

    return {
      ...viewModel,
      content
    }
  }
}
