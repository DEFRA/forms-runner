import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { type ListItem } from '~/src/server/plugins/engine/components/types.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

/**
 * "Selection controls" are checkboxes and radios (and switches), as per Material UI nomenclature.
 */
export class SelectionControlField extends ListFormComponent {
  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { options } = this

    const viewModel = super.getViewModel(payload, errors)
    let { fieldset, items, label } = viewModel

    fieldset ??= {
      legend: {
        text: label.text,
        classes: 'govuk-fieldset__legend--m'
      }
    }

    items = items?.map(({ selected, ...item }) => {
      const itemModel = { ...item, checked: selected } satisfies ListItem

      if ('bold' in options && options.bold) {
        itemModel.label ??= {}
        itemModel.label.classes = 'govuk-label--s'
      }

      return itemModel
    })

    return {
      ...viewModel,
      fieldset,
      items
    }
  }
}
