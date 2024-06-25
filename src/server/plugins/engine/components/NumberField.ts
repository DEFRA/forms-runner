import {
  type ComponentDef,
  type NumberFieldComponent
} from '@defra/forms-model'
import joi, { type Schema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormData,
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
    let schema = joi.number()

    schema = schema.label(def.title.toLowerCase())

    if (def.schema.min && def.schema.max) {
      schema = schema.$
    }
    if (def.schema.min ?? false) {
      schema = schema.min(min)
    }

    if (def.schema.max ?? false) {
      schema = schema.max(max)
    }

    if (def.options.customValidationMessage) {
      schema = schema.rule({ message: def.options.customValidationMessage })
    }

    if (def.options.required === false) {
      const optionalSchema = joi
        .alternatives()
        .try(joi.string().allow(null).allow('').default('').optional(), schema)
      this.schema = optionalSchema
    } else {
      this.schema = schema
    }
  }

  getFormSchemaKeys() {
    return { [this.name]: this.schema as Schema }
  }

  getStateSchemaKeys() {
    return { [this.name]: this.schema as Schema }
  }

  getViewModel(formData: FormData, errors?: FormSubmissionErrors) {
    const schema = this.schema
    const options = this.options
    const { suffix, prefix } = options
    const viewModelPrefix = { prefix: { text: prefix } }
    const viewModelSuffix = { suffix: { text: suffix } }
    const viewModel = {
      ...super.getViewModel(formData, errors),
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
