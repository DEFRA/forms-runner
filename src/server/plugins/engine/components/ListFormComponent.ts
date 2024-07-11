import {
  type ListComponentsDef,
  type List,
  type Item
} from '@defra/forms-model'
import joi from 'joi'

import { type FormModel } from '~/src/server/plugins/engine/components/../models/index.js'
import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type DataType } from '~/src/server/plugins/engine/components/types.js'
import {
  type FormPayload,
  type FormSubmissionState,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class ListFormComponent extends FormComponent {
  options: ListComponentsDef['options']

  list?: List
  listType: List['type']
  dataType: DataType = 'list'

  get items(): Item[] {
    return this.list?.items ?? []
  }

  get values(): (string | number | boolean)[] {
    return this.items.map((item) => item.value)
  }

  constructor(def: ListComponentsDef, model: FormModel) {
    super(def, model)
    this.list = model.getList(def.list)
    this.listType = this.list?.type ?? 'string'
    this.options = def.options

    let schema = joi[this.listType]()

    /**
     * Only allow a user to answer with values that have been defined in the list
     */
    if (def.options.required === false) {
      // null or empty string is valid for optional fields
      schema = schema.empty(null).valid(...this.values, '')
    } else {
      schema = schema.valid(...this.values).required()
    }

    schema = schema.label(def.title.toLowerCase())

    this.formSchema = schema
    this.stateSchema = schema
  }

  getDisplayStringFromState(state: FormSubmissionState): string | string[] {
    const { name, items } = this
    const value = state[name]
    const item = items.find((item) => String(item.value) === String(value))
    return item?.text ?? ''
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { name, items } = this
    const viewModel = super.getViewModel(payload, errors)
    const viewModelItems = items.map(
      ({ text, value, description = '', condition }) => ({
        text,
        value,
        description,
        selected: `${value}` === `${payload[name]}`,
        condition: condition ?? undefined
      })
    )

    viewModel.items = viewModelItems

    return viewModel
  }
}
