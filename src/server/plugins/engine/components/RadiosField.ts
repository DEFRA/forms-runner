import { type RadiosFieldComponent } from '@defra/forms-model'

import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'

export class RadiosField extends SelectionControlField {
  options: RadiosFieldComponent['options']
  schema: RadiosFieldComponent['schema']

  constructor(def: RadiosFieldComponent, model: FormModel) {
    super(def, model)

    const { schema, options } = def

    this.options = options
    this.schema = schema
  }
}
