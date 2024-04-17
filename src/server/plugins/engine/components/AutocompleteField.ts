import { ListComponentsDef } from '@defra/forms-model'

import { SelectField } from './SelectField.js'
import { FormModel } from '../models/index.js'
import { addClassOptionIfNone } from './helpers.js'
import type { FormSubmissionState } from '../../../plugins/engine/types.js'

export class AutocompleteField extends SelectField {
  constructor(def: ListComponentsDef, model: FormModel) {
    super(def, model)
    addClassOptionIfNone(this.options, 'govuk-input--width-20')
  }

  getDisplayStringFromState(state: FormSubmissionState): string {
    const { name, items } = this
    const value = state[name]
    if (Array.isArray(value)) {
      return items
        .filter((item) => value.includes(item.value))
        .map((item) => item.text)
        .join(', ')
    }
    const item = items.find((item) => String(item.value) === String(value))
    return `${item?.text ?? ''}`
  }
}
