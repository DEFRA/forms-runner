import upperFirst from 'lodash/upperFirst.js'

import {
  ComponentBase,
  type ComponentSchemaKeys
} from '~/src/server/plugins/engine/components/ComponentBase.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import { type FormComponentFieldComponent } from '~/src/server/plugins/engine/components/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormSchemaValue,
  type FormStateValue,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class FormComponent extends ComponentBase {
  hint: FormComponentFieldComponent['hint']

  isFormComponent = true

  constructor(def: FormComponentFieldComponent, model: FormModel) {
    super(def, model)

    const { hint } = def

    this.hint = hint
  }

  getFormDataFromState(state: FormSubmissionState): FormPayload {
    const { name } = this

    const payload: FormPayload = {}

    if (name in state) {
      payload.name = this.getFormValueFromState(state)
    }

    return payload
  }

  getFormValueFromState(state: FormSubmissionState): FormSchemaValue {
    const { name } = this
    const value = state[name]

    // Base form component can only handle strings/numbers
    if (!(typeof value === 'string' || typeof value === 'number')) {
      return ''
    }

    return value
  }

  getStateFromValidForm(payload: FormPayload): FormSubmissionState {
    const { name } = this

    return {
      [name]: this.getStateValueFromValidForm(payload)
    }
  }

  getStateValueFromValidForm<FormPayloadType extends FormPayload>(
    payload: FormPayloadType
  ): FormStateValue {
    const { name } = this

    const value = payload[name]

    // Check for empty fields
    const isMissing = !(name in payload) || value === undefined
    const isEmpty = value === '' || (Array.isArray(value) && !value.length)

    // Default to null in state
    if (isMissing || isEmpty) {
      return null
    }

    return value
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { hint, name, options, title } = this

    const viewModel = super.getViewModel(payload, errors)

    const isRequired = !('required' in options) || options.required !== false
    const hideOptional = 'optionalText' in options && options.optionalText
    const label = `${title}${!isRequired && !hideOptional ? optionalText : ''}`

    if (hint) {
      viewModel.hint = {
        html: hint
      }
    }

    if ('classes' in options) {
      viewModel.classes = options.classes
    }

    if ('condition' in options) {
      viewModel.condition = options.condition
    }

    errors?.errorList.forEach((err) => {
      if (err.name === name) {
        err.text = upperFirst(err.text)

        viewModel.errorMessage = {
          text: err.text
        }
      }
    })

    const value = payload[name]

    return {
      ...viewModel,
      label: {
        text: label
      },
      id: name,
      name,
      value
    }
  }

  getFormSchemaKeys(): ComponentSchemaKeys {
    return { [this.name]: this.formSchema }
  }

  getStateSchemaKeys(): ComponentSchemaKeys {
    return { [this.name]: this.stateSchema }
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const { name } = this
    const value = state[name]

    // Base form component can only handle strings/numbers
    if (!(typeof value === 'string' || typeof value === 'number')) {
      return ''
    }

    return value.toString()
  }
}
