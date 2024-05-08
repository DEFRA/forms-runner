import { type InputFieldsComponentsDef } from '@defra/forms-model'
import { format, parseISO } from 'date-fns'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import * as helpers from '~/src/server/plugins/engine/components/helpers.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormData,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

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

  getViewModel(formData: FormData, errors?: FormSubmissionErrors) {
    return {
      ...super.getViewModel(formData, errors),
      type: 'datetime-local'
    }
  }
}
