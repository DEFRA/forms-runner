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

  get items(): Item[] {
    return this.list?.items ?? []
  }

  get values(): Item['value'][] {
    return this.items.map((item) => item.value)
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

  getDisplayStringFromState(state: FormSubmissionState) {
    const { items, name } = this

    const { [name]: value } = this.getFormDataFromState(state)
    const item = items.find((item) => item.value === value)

    return item?.text ?? ''
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { name, items } = this

    const viewModel = super.getViewModel(payload, errors)

    const viewModelItems = items.map((item) => {
      const value =
        typeof payload[name] === 'string' ||
        typeof payload[name] === 'number' ||
        typeof payload[name] === 'boolean'
          ? payload[name]
          : ''

      return {
        ...item,
        value: item.value,
        hint: { text: item.description ?? '' },
        selected: item.value === value,
        condition: item.condition ?? undefined
      } satisfies ListItem
    })

    viewModel.items = viewModelItems

    return viewModel
  }
}
