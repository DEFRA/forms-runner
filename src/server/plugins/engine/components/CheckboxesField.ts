import { type CheckboxesFieldComponent } from '@defra/forms-model'
import joi, { type ArraySchema } from 'joi'

import {
  SelectionControlField,
  type SelectionControlPayload,
  type SelectionControlState
} from '~/src/server/plugins/engine/components/SelectionControlField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class CheckboxesField extends SelectionControlField {
  declare options: CheckboxesFieldComponent['options']
  declare schema: CheckboxesFieldComponent['schema']
  declare formSchema: ArraySchema<string> | ArraySchema<number>
  declare stateSchema: ArraySchema<string> | ArraySchema<number>

  constructor(def: CheckboxesFieldComponent, model: FormModel) {
    super(def, model)

    const { listType: type } = this
    const { options, schema, title } = def

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
    this.schema = schema
  }

  getFormValueFromState(state: FormSubmissionState<SelectionControlState>) {
    const { name } = this

    if (Array.isArray(state[name])) {
      return state[name]
    }
  }

  getViewModel(
    payload: FormPayload<SelectionControlPayload>,
    errors?: FormSubmissionErrors
  ) {
    const viewModel = super.getViewModel(payload, errors)
    let { items, value } = viewModel

    let payloadItems: string[] | number[] = []

    // Allow strings (temporarily) via controller renderWithErrors()
    payloadItems = Array.isArray(value) ? value : payloadItems
    payloadItems = typeof value === 'string' ? [value] : payloadItems

    // Apply checked status to each of the items
    items = items?.map((item) => {
      const checked = payloadItems.some(
        (value) => `${item.value}` === `${value}`
      )

      return {
        ...item,
        checked
      }
    })

    return {
      ...viewModel,
      value: payloadItems,
      items
    }
  }
}
