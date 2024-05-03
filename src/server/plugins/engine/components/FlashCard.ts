import { type Item, type List } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import {
  type FormData,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class FlashCard extends ComponentBase {
  list: List
  get items(): Item[] {
    return this.list.items ?? []
  }

  constructor(def, model) {
    super(def, model)
    this.list = model.getList(def.list)
  }

  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const { items } = this
    const viewModel = super.getViewModel(formData, errors)

    viewModel.content = items.map(({ text, description, condition }) => {
      return {
        title: text,
        text: description || '',
        condition
      }
    })
    return viewModel
  }
}
