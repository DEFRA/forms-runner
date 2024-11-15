import { type AutocompleteFieldComponent } from '@defra/forms-model'

import { SelectField } from '~/src/server/plugins/engine/components/SelectField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

export class AutocompleteField extends SelectField {
  declare options: AutocompleteFieldComponent['options']

  constructor(def: AutocompleteFieldComponent, model: FormModel) {
    super(def, model)

    const { options } = def
    let { formSchema } = this

    if (options.required !== false) {
      formSchema = formSchema.messages({
        'any.only': messageTemplate.required,
        'any.required': messageTemplate.required
      })
    }

    this.options = options
    this.formSchema = formSchema
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const viewModel = super.getViewModel(payload, errors)
    let { formGroup } = viewModel

    formGroup ??= {}
    formGroup.attributes = {
      'data-module': 'govuk-accessible-autocomplete'
    }

    return {
      ...viewModel,
      formGroup
    }
  }
}
