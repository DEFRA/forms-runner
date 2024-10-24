import { type CheckboxesFieldComponent } from '@defra/forms-model'
import joi, { type ArraySchema } from 'joi'

import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'

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
}
