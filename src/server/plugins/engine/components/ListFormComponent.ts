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
  type FormSubmissionState,
  type FormSubmissionErrors
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

  get values(): (string | number | boolean)[] {
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

    let formSchema = joi[this.listType]()
      .valid(...this.values)
      .label(title.toLowerCase())
      .required()

    if (options.required === false) {
      formSchema = formSchema.valid('').optional()
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
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
      ({ text, value, description = '', condition }) =>
        ({
          text,
          value: `${value}`,
          hint: { text: description },
          selected: `${value}` === `${payload[name]}`,
          condition: condition ?? undefined
        }) satisfies ListItem
    )

    viewModel.items = viewModelItems

    return viewModel
  }
}
