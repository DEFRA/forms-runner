import { type RadiosFieldComponent } from '@defra/forms-model'

import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'

export class RadiosField extends SelectionControlField {
  declare options: RadiosFieldComponent['options']

  constructor(
    def: RadiosFieldComponent,
    props: ConstructorParameters<typeof SelectionControlField>[1]
  ) {
    super(def, props)

    const { options } = def
    let { formSchema } = this

    if (options.required === false) {
      formSchema = formSchema.optional()
    }

    this.formSchema = formSchema
    this.options = options
  }
}
