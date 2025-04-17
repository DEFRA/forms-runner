import { type YesNoFieldComponent } from '@defra/forms-model'

import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { type ErrorMessageTemplateList } from '~/src/server/plugins/engine/types.js'
import { convertToLanguageMessages } from '~/src/server/utils/type-utils.js'

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
    super({ ...def, list: '__yesNo' }, props)

    const { options } = def
    let { formSchema } = this

    addClassOptionIfNone(options, 'govuk-radios--inline')

    if (options.required === false) {
      formSchema = formSchema.optional()
    }

    formSchema = formSchema.messages(
      convertToLanguageMessages({
        'any.required': messageTemplate.selectYesNoRequired
      })
    )

    this.formSchema = formSchema
    this.options = options
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [
        {
          type: 'selectYesNoRequired',
          template: messageTemplate.selectYesNoRequired
        }
      ],
      advancedSettingsErrors: []
    }
  }
}
