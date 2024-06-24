import { SelectField } from '~/src/server/plugins/engine/components/SelectField.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'

export class AutocompleteField extends SelectField {
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
    return item?.text ?? ''
  }
}
