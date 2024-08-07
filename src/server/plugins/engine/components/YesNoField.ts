import { type YesNoFieldComponent } from '@defra/forms-model'

import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

/**
 * @description
 * YesNoField is a radiosField with predefined values.
 */
export class YesNoField extends ListFormComponent {
  declare options: YesNoFieldComponent['options']
  declare schema: YesNoFieldComponent['schema']

  constructor(def: YesNoFieldComponent, model: FormModel) {
    super({ ...def, list: '__yesNo' }, model)

    const { options, schema } = def

    addClassOptionIfNone(options, 'govuk-radios--inline')

    this.options = options
    this.schema = schema
  }

  getViewModel(
    payload: FormPayload<YesNoPayload>,
    errors?: FormSubmissionErrors
  ) {
    const viewModel = super.getViewModel(payload, errors)
    let { fieldset, items, label, value } = viewModel

    fieldset ??= {
      legend: {
        text: label.text,
        classes: 'govuk-fieldset__legend--m'
      }
    }

    items = items?.map((item) => ({
      text: item.text,
      value: `${item.value}`,
      checked: item.selected
    }))

    if (typeof value !== 'boolean') {
      value = undefined
    }

    return {
      ...viewModel,
      fieldset,
      items
    }
  }
}

export type YesNoPayload = Record<string, boolean | undefined>
export type YesNoState = Record<string, boolean | null>
