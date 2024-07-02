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
  schema: ListComponentsDef['schema']
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

    const { schema, options, list: listName, title } = def

    this.list = model.getList(listName)
    this.listType = this.list?.type ?? 'string'

    let formSchema = joi[this.listType]()
      .default('')
      .valid(...this.values)
      .required()
      .label(title.toLowerCase())

    if (options.required === false) {
      formSchema = formSchema.valid('').optional()
    }

    formSchema = formSchema.label(title.toLowerCase())

    this.formSchema = formSchema
    this.stateSchema = formSchema
    this.schema = schema
    this.options = options
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
