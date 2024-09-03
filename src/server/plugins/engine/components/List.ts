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
  declare options: ListComponent['options']
  hint: ListComponent['hint']
  list?: ListType

  get items(): Item[] {
    return this.list?.items ?? []
  }

  constructor(def: ListComponent, model: FormModel) {
    super(def, model)

    const { hint, list, options } = def

    this.hint = hint
    this.list = model.getList(list)
    this.options = options
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { items, options } = this
    const viewModel = super.getViewModel(payload, errors)

    if (options.type) {
      viewModel.type = options.type
    }

    if (options.classes) {
      viewModel.classes = options.classes
    }

    viewModel.content = {
      title: !options.hideTitle ? this.title : undefined,
      text: this.hint ?? ''
    }

    viewModel.items = items.map((item) => {
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
