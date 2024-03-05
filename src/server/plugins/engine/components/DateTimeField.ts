import { format, parseISO } from 'date-fns'
import { InputFieldsComponentsDef } from '@defra/forms-model'

import * as helpers from './helpers'
import { FormComponent } from './FormComponent'
import { FormModel } from '../models'
import { addClassOptionIfNone } from './helpers'
import type {
  FormData,
  FormSubmissionErrors,
  FormSubmissionState
} from '../types'

export class DateTimeField extends FormComponent {
  constructor(def: InputFieldsComponentsDef, model: FormModel) {
    super(def, model)
    addClassOptionIfNone(this.options, 'govuk-input--width-20')
  }

  getFormSchemaKeys() {
    return helpers.getFormSchemaKeys(this.name, 'date', this)
  }

  getStateSchemaKeys() {
    return helpers.getStateSchemaKeys(this.name, 'date', this)
  }

  getFormValueFromState(state: FormSubmissionState) {
    const name = this.name
    const value = state[name]
    return value ? format(parseISO(value), "yyyy-MM-dd'T'HH:mm") : value
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const name = this.name
    const value = state[name]
    return value ? format(parseISO(value), 'd MMMM yyyy h:mm') : ''
  }

  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    return {
      ...super.getViewModel(formData, errors),
      type: 'datetime-local'
    }
  }
}
