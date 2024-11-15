import {
  type Item,
  type List as ListType,
  type ListComponent
} from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type ListItem } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionError
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

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const { items: listItems, options } = this

    const viewModel = super.getViewModel(payload, errors)
    let { classes, content, items, type } = viewModel

    if (options.type) {
      type = options.type
    }

    if (options.bold) {
      classes ??= ''
      classes = `${classes} govuk-!-font-weight-bold`.trim()
    }

    content = {
      title: !options.hideTitle ? this.title : undefined,
      text: this.hint ?? ''
    }

    items = listItems.map((item) => {
      const itemModel: ListItem = { ...item }

      if (item.description) {
        itemModel.hint = {
          text: item.description
        }
      }

      return itemModel
    })

    return {
      ...viewModel,
      type,
      classes,
      content,
      items
    }
  }
}
