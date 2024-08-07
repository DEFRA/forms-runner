import { type InsetTextComponent } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type ViewModel } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class InsetText extends ComponentBase {
  declare options: InsetTextComponent['options']
  declare schema: InsetTextComponent['schema']
  content: InsetTextComponent['content']

  constructor(def: InsetTextComponent, model: FormModel) {
    super(def, model)

    const { content, schema, options } = def

    this.content = content
    this.options = options
    this.schema = schema
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors): ViewModel {
    return {
      ...super.getViewModel(payload, errors),
      content: this.content
    }
  }
}
