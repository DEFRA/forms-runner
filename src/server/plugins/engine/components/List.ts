import {
  type ListComponentsDef,
  type Item,
  type List as ListType
} from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class List extends ComponentBase {
  list?: ListType
  get items(): Item[] {
    return this.list?.items ?? []
  }

  constructor(def: ListComponentsDef, model: FormModel) {
    super(def, model)
    this.list = model.getList(def.list)
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { items, options } = this
    const viewModel = super.getViewModel(payload, errors)

    if ('type' in options && options.type) {
      viewModel.type = options.type
    }

    viewModel.content = items.map((item) => {
      const contentItem: { text: string; condition?: any } = {
        text: item.text
      }
      if (item.condition) {
        contentItem.condition = item.condition
      }
      return contentItem
    })

    return viewModel
  }
}
