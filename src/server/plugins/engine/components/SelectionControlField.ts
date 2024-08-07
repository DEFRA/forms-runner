import {
  ListFormComponent,
  type ListFormPayload,
  type ListFormState
} from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { type ListItem } from '~/src/server/plugins/engine/components/types.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

/**
 * "Selection controls" are checkboxes and radios (and switches), as per Material UI nomenclature.
 */
export class SelectionControlField extends ListFormComponent {
  getViewModel(
    payload: FormPayload<SelectionControlPayload>,
    errors?: FormSubmissionErrors
  ) {
    const { options } = this

    const viewModel = super.getViewModel(payload, errors)
    let { fieldset, items, label } = viewModel

    fieldset ??= {
      legend: {
        text: label.text,
        classes: 'govuk-fieldset__legend--m'
      }
    }

    items = items?.map((item) => {
      const itemModel: ListItem = {
        text: item.text,
        value: item.value,
        checked: item.selected
      }

      if ('bold' in options && options.bold) {
        itemModel.label = {
          classes: 'govuk-label--s'
        }
      }

      return itemModel

      // FIXME:- add this back when GDS fix accessibility issues involving conditional reveal fields
      // return super.addConditionalComponents(item, itemModel, payload, errors);
    })

    return {
      ...viewModel,
      fieldset,
      items
    }
  }
}

export type SelectionControlPayload = ListFormPayload
export type SelectionControlState = ListFormState
