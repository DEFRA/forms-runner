import {
  type Item,
  type List,
  type ListComponentsDef,
  type SelectionComponentsDef,
  type YesNoFieldComponent
} from '@defra/forms-model'
import joi, {
  type ArraySchema,
  type BooleanSchema,
  type NumberSchema,
  type StringSchema
} from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import {
  DataType,
  type ListItem
} from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class ListFormComponent extends FormComponent {
  declare options: Extract<
    SelectionComponentsDef,
    { options: object }
  >['options']

  declare formSchema:
    | ArraySchema<string>
    | ArraySchema<number>
    | BooleanSchema<string>
    | NumberSchema<string>
    | StringSchema

  declare stateSchema:
    | ArraySchema<string>
    | ArraySchema<number>
    | BooleanSchema<string>
    | NumberSchema<string>
    | StringSchema

  list?: List
  listType: List['type'] = 'string'
  dataType: DataType = DataType.List

  get items(): Item[] {
    return this.list?.items ?? []
  }

  get values(): Item['value'][] {
    return this.items.map(({ value }) => value)
  }

  constructor(
    def:
      | SelectionComponentsDef // Allow for Yes/No field custom list
      | (YesNoFieldComponent & Pick<ListComponentsDef, 'list'>),
    model: FormModel
  ) {
    super(def, model)

    const { options, title } = def

    if ('list' in def) {
      this.list = model.getList(def.list)
      this.listType = this.list?.type ?? 'string'
    }

    const formSchema = joi[this.listType]()
      .valid(...this.values)
      .label(title.toLowerCase())
      .required()

    this.formSchema = formSchema
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { values: listValues, name } = this

    const value = state[name]
    const values = [value ?? []].flat()

    const selected = listValues.filter((listValue) =>
      values.includes(listValue)
    )

    if (!selected.length) {
      return
    }

    // Support multiple values for checkboxes
    return Array.isArray(value) ? selected : selected[0]
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const { items: listItems, name } = this

    // Support multiple values for checkboxes
    const value = state[name]
    const values = [value ?? []].flat()

    return listItems
      .filter((item) => values.includes(item.value))
      .map((item) => item.text)
      .join(', ')
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { items: listItems } = this

    const viewModel = super.getViewModel(payload, errors)
    let { items, value } = viewModel

    // Support multiple values for checkboxes
    const values = [value ?? []].flat()

    items = listItems.map((item) => {
      const selected = values.includes(item.value)
      const itemModel: ListItem = { ...item, selected }

      if (item.description) {
        itemModel.hint = {
          text: item.description
        }
      }

      return itemModel
    })

    return {
      ...viewModel,
      items
    }
  }
}
