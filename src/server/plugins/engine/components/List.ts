import {
  type Item,
  type List as ListType,
  type ListComponent
} from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type ListItem } from '~/src/server/plugins/engine/components/types.js'

export class List extends ComponentBase {
  declare options: ListComponent['options']
  hint: ListComponent['hint']
  list?: ListType

  get items(): Item[] {
    return this.list?.items ?? []
  }

  constructor(
    def: ListComponent,
    props: ConstructorParameters<typeof ComponentBase>[1]
  ) {
    super(def, props)

    const { hint, list, options } = def
    const { model } = props

    this.hint = hint
    this.list = model.getList(list)
    this.options = options
  }

  getViewModel() {
    const { items: listItems, options, viewModel } = this

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
