import { type YesNoFieldComponent } from '@defra/forms-model'

import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers.js'

/**
 * @description
 * YesNoField is a radiosField with predefined values.
 */
export class YesNoField extends SelectionControlField {
  declare options: YesNoFieldComponent['options']

  constructor(
    def: YesNoFieldComponent,
    props: ConstructorParameters<typeof SelectionControlField>[1]
  ) {
    super({ ...def }, props)

    const { options } = def
    let { formSchema } = this

    addClassOptionIfNone(options, 'govuk-radios--inline')

    if (options.required === false) {
      formSchema = formSchema.optional()
    }

    this.formSchema = formSchema
    this.options = options
  }
}
