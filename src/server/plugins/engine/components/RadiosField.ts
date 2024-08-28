import { type RadiosFieldComponent } from '@defra/forms-model'

import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'

export class RadiosField extends SelectionControlField {
  declare options: RadiosFieldComponent['options']

  constructor(def: RadiosFieldComponent, model: FormModel) {
    super(def, model)

    const { options } = def

    this.options = options
  }
}
