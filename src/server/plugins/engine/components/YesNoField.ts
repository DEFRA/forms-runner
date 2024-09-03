import { type YesNoFieldComponent } from '@defra/forms-model'

import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

/**
 * @description
 * YesNoField is a radiosField with predefined values.
 */
export class YesNoField extends ListFormComponent {
  declare options: YesNoFieldComponent['options']

  constructor(def: YesNoFieldComponent, model: FormModel) {
    super({ ...def, list: '__yesNo' }, model)

    const { options } = def

    addClassOptionIfNone(options, 'govuk-radios--inline')

    this.options = options
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const value = state[this.name]
    const item = this.items.find((item) => item.value === value)
    return item?.text ?? ''
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(payload, errors)
    let { fieldset, items, label } = viewModel

    fieldset ??= {
      legend: {
        text: label.text,
        classes: 'govuk-fieldset__legend--m'
      }
    }

    items = items?.map(({ selected, ...item }) => ({
      ...item,
      checked: selected
    }))

    return {
      ...viewModel,
      fieldset,
      items
    }
  }
}
