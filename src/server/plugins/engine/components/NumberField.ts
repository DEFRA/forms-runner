import {
  type ComponentDef,
  type NumberFieldComponent
} from '@defra/forms-model'
import joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class NumberField extends FormComponent {
  schemaOptions: NumberFieldComponent['schema']
  options: NumberFieldComponent['options']

  constructor(def: ComponentDef, model: FormModel) {
    super(def, model)
    this.schemaOptions = def.schema
    this.options = def.options
    const { min, max } = def.schema
    let formSchema = joi.number()

    formSchema = formSchema.label(def.title.toLowerCase())

    if (def.schema.min && def.schema.max) {
      formSchema = formSchema.$
    }
    if (def.schema.min ?? false) {
      formSchema = formSchema.min(min)
    }

    if (def.schema.max ?? false) {
      formSchema = formSchema.max(max)
    }

    if (def.options.customValidationMessage) {
      formSchema = formSchema.rule({
        message: def.options.customValidationMessage
      })
    }

    if (def.options.required === false) {
      const optionalSchema = joi
        .alternatives<string | number>()
        .try(
          joi.string().allow(null).allow('').default('').optional(),
          formSchema
        )

      this.formSchema = optionalSchema
    } else {
      this.formSchema = formSchema
    }
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const schema = this.schema
    const options = this.options
    const { suffix, prefix } = options
    const viewModelPrefix = { prefix: { text: prefix } }
    const viewModelSuffix = { suffix: { text: suffix } }
    const viewModel = {
      ...super.getViewModel(payload, errors),
      type: 'number',
      // ...False returns nothing, so only adds content when
      // the given options are present.
      ...(options.prefix && viewModelPrefix),
      ...(options.suffix && viewModelSuffix)
    }

    if (this.schemaOptions.precision) {
      viewModel.attributes.step = '0.' + '1'.padStart(schema.precision, '0')
    }

    return viewModel
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    return state[this.name] || state[this.name] === 0
      ? state[this.name].toString()
      : undefined
  }
}
