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
  declare schema: CheckboxesFieldComponent['schema']
  declare formSchema: ArraySchema<string> | ArraySchema<number>
  declare stateSchema: ArraySchema<string> | ArraySchema<number>

  constructor(def: CheckboxesFieldComponent, model: FormModel) {
    super(def, model)

    const { options, schema, title } = def
    const type = this.listType

    let formSchema =
      type === 'string' ? joi.array<string>() : joi.array<number>()

    const itemsSchema = joi[type]()
      .valid(...this.values)
      .label(title.toLowerCase())

    formSchema = formSchema
      .items(itemsSchema)
      .single()
      .label(title.toLowerCase())

    if (options.required === false) {
      // null is valid for optional fields
      formSchema = formSchema.optional().allow(null).default(null)
    } else {
      formSchema = formSchema.required()
    }

    this.formSchema = formSchema
    this.stateSchema = formSchema
    this.options = options
    this.schema = schema
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
    const value = payload[this.name]
    let items: string[] = []

    if (typeof value === 'string') {
      const val = value.trim()
      if (val) {
        items = val.split(',')
      }
    }

    // Apply checked status to each of the items
    viewModel.items?.forEach((item) => {
      item.checked = items.some((i) => `${item.value}` === i)
    })

    return viewModel
  }
}
