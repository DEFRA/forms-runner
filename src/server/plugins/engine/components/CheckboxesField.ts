import { type CheckboxesFieldComponent } from '@defra/forms-model'
import joi, { type ArraySchema } from 'joi'

import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class CheckboxesField extends SelectionControlField {
  declare options: CheckboxesFieldComponent['options']
  declare formSchema: ArraySchema<string> | ArraySchema<number>
  declare stateSchema: ArraySchema<string> | ArraySchema<number>

  constructor(def: CheckboxesFieldComponent, model: FormModel) {
    super(def, model)

    const { listType: type } = this
    const { options, title } = def

    let formSchema =
      type === 'string' ? joi.array<string>() : joi.array<number>()

    const itemsSchema = joi[type]()
      .valid(...this.values)
      .label(title.toLowerCase())

    formSchema = formSchema
      .items(itemsSchema)
      .single()
      .label(title.toLowerCase())
      .required()

    if (options.required === false) {
      formSchema = formSchema.optional()
    }

    this.formSchema = formSchema.default([])
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const { items, name } = this

    const values = state[name]

    return values
      ?.map((value) => items.find((item) => item.value === value)?.text ?? '')
      .join(', ')
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { name } = this

    if (Array.isArray(state[name])) {
      return state[name]
    }
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(payload, errors)
    let { items, value } = viewModel

    // Allow strings (temporarily) via controller renderWithErrors()
    const payloadItems = [value]
      .flat()
      .filter((value) => typeof value === 'string' || typeof value === 'number')

    // Apply checked status to each of the items
    items = items?.map((item) => ({
      ...item,
      checked: payloadItems.some((value) => item.value === value)
    }))

    return {
      ...viewModel,
      value: payloadItems,
      items
    }
  }
}
