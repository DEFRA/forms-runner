import { type ListComponentsDef } from '@defra/forms-model'
import joi from 'joi'

import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class CheckboxesField extends SelectionControlField {
  constructor(def: ListComponentsDef, model: FormModel) {
    super(def, model)

    const { options, title } = def

    let formSchema = joi
      .array()
      .single()
      .default([])
      .items(joi[this.listType]().allow(...this.values))
      .required()
      .label(title.toLowerCase())

    if (options.required === false) {
      formSchema = formSchema.allow('').optional()
    }

    this.formSchema = formSchema
    this.stateSchema = formSchema
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    return state[this.name]
      ?.map(
        (value) =>
          this.items.find((item) => `${item.value}` === `${value}`)?.text ?? ''
      )
      .join(', ')
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(payload, errors)

    // Handle single (string) or multiple (array) values
    const payloadItems = this.name in payload ? [payload[this.name]].flat() : []

    viewModel.items = (viewModel.items ?? []).map((item) => ({
      ...item,
      checked: payloadItems.some((i) => `${item.value}` === i)
    }))

    return viewModel
  }
}
