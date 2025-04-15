import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { type ListItem } from '~/src/server/plugins/engine/components/types.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

/**
 * "Selection controls" are checkboxes and radios (and switches), as per Material UI nomenclature.
 */
export class SelectionControlField extends ListFormComponent {
  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const { options } = this

    const viewModel = super.getViewModel(payload, errors)
    let { fieldset, items, label } = viewModel

    fieldset ??= {
      legend: {
        text: label.text,
        classes: 'govuk-fieldset__legend--m'
      }
    }

    items = items.map((item) => {
      const { selected: checked } = item
      const itemModel = { ...item, checked } satisfies ListItem

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

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [
        { type: 'selectRequired', template: messageTemplate.selectRequired }
      ],
      advancedSettingsErrors: []
    }
  }
}
