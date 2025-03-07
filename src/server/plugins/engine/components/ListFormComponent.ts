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
import { type ListItem } from '~/src/server/plugins/engine/components/types.js'
import {
  type FormPayload,
  type FormSubmissionError,
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
    | NumberSchema
    | StringSchema

  declare stateSchema:
    | ArraySchema<string>
    | ArraySchema<number>
    | BooleanSchema<string>
    | NumberSchema<string>
    | NumberSchema
    | StringSchema

  list?: List
  listType: List['type'] = 'string'

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
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { options, title } = def
    const { model } = props

    if ('list' in def) {
      this.list = model.getList(def.list)
      this.listType = this.list?.type ?? 'string'
    }

    let formSchema = joi[this.listType]()
      .valid(...this.values)
      .label(title)
      .required()

    if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    }

    this.formSchema = formSchema
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
  }

  getFormValueFromState(
    state: FormSubmissionState
  ): Item['value'] | Item['value'][] | undefined {
    const { name, items } = this

    const value = state[name]

    // Allow for array values via subclass
    const values = this.isValue(value) ? [value].flat() : []
    const selected = items.filter((item) => values.includes(item.value))

    return selected.at(0)?.value
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const { items } = this

    // Allow for array values via subclass
    const value = this.getFormValueFromState(state)
    const values = [value ?? []].flat()

    return items
      .filter((item) => values.includes(item.value))
      .map((item) => item.text)
      .join(', ')
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const { items: listItems } = this

    const viewModel = super.getViewModel(payload, errors)
    const { value } = viewModel

    // Support multiple values for checkboxes
    const values = this.isValue(value) ? [value].flat() : []

    const items = listItems.map((item) => {
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
