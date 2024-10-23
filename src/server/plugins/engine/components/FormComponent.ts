import { type FormComponentsDef } from '@defra/forms-model'
import upperFirst from 'lodash/upperFirst.js'

import {
  ComponentBase,
  type ComponentSchemaKeys
} from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionErrors,
  type FormSubmissionState,
  type FormValue
} from '~/src/server/plugins/engine/types.js'

export class FormComponent extends ComponentBase {
  hint: FormComponentsDef['hint']
  children: ComponentCollection | undefined

  isFormComponent = true

  constructor(def: FormComponentsDef, model: FormModel) {
    super(def, model)

    const { hint } = def

    this.hint = hint
  }

  getFormDataFromState(state: FormSubmissionState): FormPayload {
    const name = this.name

    if (!(name in state)) {
      return {}
    }

    return {
      [name]: this.getFormValueFromState(state)
    }
  }

  getFormValueFromState(state: FormSubmissionState): FormValue {
    const name = this.name

    if (!(name in state)) {
      return
    }

    return state[name] ?? undefined
  }

  getStateFromValidForm(payload: FormPayload): FormState {
    const name = this.name

    return {
      [name]: this.getStateValueFromValidForm(payload)
    }
  }

  getStateValueFromValidForm(payload: FormPayload): FormStateValue {
    const name = this.name
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
    const { hint, name, options = {}, title } = this

    const viewModel = super.getViewModel(payload, errors)

    const isRequired = !('required' in options) || options.required !== false
    const hideOptional = 'optionalText' in options && options.optionalText
    const label = `${title}${!isRequired && !hideOptional ? optionalText : ''}`

    if (hint) {
      viewModel.hint = {
        text: hint
      }
    }

    errors?.errorList.forEach((err) => {
      if (err.name === name) {
        err.text = upperFirst(err.text)

        viewModel.errorMessage = {
          text: err.text
        }
      }
    })

    return {
      ...viewModel,
      label: {
        text: label
      },
      id: name,
      name,
      value: payload[name]
    }
  }

  getFormSchemaKeys(): ComponentSchemaKeys {
    return { [this.name]: this.formSchema }
  }

  getStateSchemaKeys(): ComponentSchemaKeys {
    return { [this.name]: this.stateSchema }
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const value = state[this.name]

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value.toString()
    }

    return ''
  }
}
