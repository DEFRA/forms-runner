import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { type ListItem } from '~/src/server/plugins/engine/components/types.js'
import {
  type FormData,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

/**
 * "Selection controls" are checkboxes and radios (and switches), as per Material UI nomenclature.
 */
export class SelectionControlField extends ListFormComponent {
  getViewModel(formData: FormData, errors?: FormSubmissionErrors) {
    const { name, options } = this

    const viewModel = super.getViewModel(formData, errors)
    let { fieldset, items, label } = viewModel

    if (!('hideTitle' in options && options.hideTitle)) {
      fieldset ??= {
        legend: {
          text: label.text,
          classes: 'govuk-fieldset__legend--m'
        }
      }
    }

    items = items?.map((item) => {
      const itemModel: ListItem = {
        text: item.text,
        value: item.value,
        checked: `${item.value}` === `${formData[name]}`
      }

      if (options.bold) {
        itemModel.label = {
          classes: 'govuk-label--s'
        }
      }

      if (item.description) {
        itemModel.hint = {
          html: item.description
        }
      }

      return itemModel

      // FIXME:- add this back when GDS fix accessibility issues involving conditional reveal fields
      // return super.addConditionalComponents(item, itemModel, formData, errors);
    })

    return {
      ...viewModel,
      fieldset,
      items
    }
  }
}
