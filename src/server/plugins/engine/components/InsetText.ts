import { type InsetTextComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'

export class InsetText extends ComponentBase {
  content: InsetTextComponent['content']

  constructor(
    def: InsetTextComponent,
    props: ConstructorParameters<typeof ComponentBase>[1]
  ) {
    super(def, props)

    const { content } = def

    this.content = content
  }

  getViewModel() {
    const { content, viewModel } = this

    return {
      ...viewModel,
      content
    }
  }
}
