import {
  type EmailAddressFieldComponent,
  type TextFieldComponent
} from '@defra/forms-model'
import joi, { type StringSchema } from 'joi'

import {
  FormComponent,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type ErrorMessageTemplateList,
  type FormState,
  type FormStateValue,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class TextField extends FormComponent {
  declare options:
    | TextFieldComponent['options']
    | EmailAddressFieldComponent['options']

  declare schema: TextFieldComponent['schema']

  declare formSchema: StringSchema
  declare stateSchema: StringSchema

  constructor(
    def: TextFieldComponent | EmailAddressFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { options } = def
    const schema = 'schema' in def ? def.schema : {}

    let formSchema = joi.string().trim().label(this.label).required()

    if (options.required === false) {
      formSchema = formSchema.allow('')
    }

    if (typeof schema.length !== 'number') {
      if (typeof schema.max === 'number') {
        formSchema = formSchema.max(schema.max)
      }

      if (typeof schema.min === 'number') {
        formSchema = formSchema.min(schema.min)
      }
    } else {
      formSchema = formSchema.length(schema.length)
    }

    if (schema.regex) {
      const pattern = new RegExp(schema.regex)
      formSchema = formSchema.pattern(pattern)
    }

    if (options.customValidationMessage) {
      const message = options.customValidationMessage

      formSchema = formSchema.messages({
        'any.required': message,
        'string.empty': message,
        'string.max': message,
        'string.min': message,
        'string.length': message,
        'string.pattern.base': message
      })
    } else if (options.customValidationMessages) {
      formSchema = formSchema.messages(options.customValidationMessages)
    }

    this.formSchema = formSchema.default('')
    this.stateSchema = formSchema.default(null).allow(null)
    this.options = options
    this.schema = schema
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { name } = this
    return this.getFormValue(state[name])
  }

  getFormValue(value?: FormStateValue | FormState) {
    return this.isValue(value) ? value : undefined
  }

  isValue(value?: FormStateValue | FormState): value is string {
    return TextField.isText(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return {
      baseErrors: [{ type: 'required', template: messageTemplate.required }],
      advancedSettingsErrors: [
        { type: 'min', template: messageTemplate.min },
        { type: 'max', template: messageTemplate.max }
      ]
    }
  }

  static isText(value?: FormStateValue | FormState): value is string {
    return isFormValue(value) && typeof value === 'string'
  }
}
