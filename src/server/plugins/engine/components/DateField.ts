import { type DateFieldComponent } from '@defra/forms-model'
import { add, sub, format, parseISO } from 'date-fns'
import joi from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers.js'
import { type DataType } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormData,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class DateField extends FormComponent {
  dataType = 'date' as DataType
  constructor(def: DateFieldComponent, model: FormModel) {
    super(def, model)
    addClassOptionIfNone(this.options, 'govuk-input--width-10')
    const { options = {} } = def

    let schema = joi.date()

    schema = schema.label(def.title.toLowerCase())
    const { maxDaysInPast, maxDaysInFuture } = options

    if (maxDaysInPast ?? false) {
      schema = schema.min(sub(new Date(), { days: maxDaysInPast }))
    }

    if (maxDaysInFuture ?? false) {
      schema = schema.max(add(new Date(), { days: maxDaysInFuture }))
    }

    if (options.required === false) {
      const optionalSchema = joi
        .alternatives()
        .try(joi.string().allow(null).allow('').default('').optional(), schema)
      this.schema = optionalSchema
    } else {
      this.schema = schema
    }
  }

  getFormSchemaKeys() {
    return { [this.name]: this.schema as joi.Schema }
  }

  getStateSchemaKeys() {
    return { [this.name]: this.schema as joi.Schema }
  }

  getFormValueFromState(state: FormSubmissionState) {
    const name = this.name
    const value = state[name]
    return value ? format(parseISO(value), 'yyyy-MM-dd') : value
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const name = this.name
    const value = state[name]
    return value ? format(parseISO(value), 'd MMMM yyyy') : ''
  }

  getViewModel(formData: FormData, errors?: FormSubmissionErrors) {
    return {
      ...super.getViewModel(formData, errors),
      type: 'date'
    }
  }
}
