import {
  type Item,
  type List as ListType,
  type ListComponent
} from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class List extends ComponentBase {
  declare schema: ListComponent['schema']
  declare options: ListComponent['options']
  list?: ListType

  get items(): Item[] {
    return this.list?.items ?? []
  }

  constructor(def: ListComponent, model: FormModel) {
    super(def, model)

    const { list, options, schema } = def

    this.list = model.getList(list)
    this.options = options
    this.schema = schema
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { items, options } = this
    const viewModel = super.getViewModel(payload, errors)

    if (options.type) {
      viewModel.type = options.type
    }

    viewModel.content = items.map((item) => {
      const contentItem: { text: string; condition?: string } = {
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
