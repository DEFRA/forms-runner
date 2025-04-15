import { type AutocompleteFieldComponent } from '@defra/forms-model'

import { SelectField } from '~/src/server/plugins/engine/components/SelectField.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type FormPayload,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

export class AutocompleteField extends SelectField {
  declare options: AutocompleteFieldComponent['options']

  constructor(
    def: AutocompleteFieldComponent,
    props: ConstructorParameters<typeof SelectField>[1]
  ) {
    super(def, props)

    const { options } = def
    let { formSchema } = this

    if (options.required !== false) {
      const messages = options.customValidationMessages

      formSchema = formSchema.messages({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        'any.only':
          messages?.['any.only'] ?? (messageTemplate.required as string),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        'any.required':
          messages?.['any.required'] ?? (messageTemplate.required as string)
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
