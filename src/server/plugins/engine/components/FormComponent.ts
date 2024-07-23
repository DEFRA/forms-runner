import capitalize from 'lodash/capitalize.js'

import {
  ComponentBase,
  type ComponentSchemaKeys
} from '~/src/server/plugins/engine/components/ComponentBase.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import {
  type FormPayload,
  type FormSubmissionState,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class FormComponent extends ComponentBase {
  isFormComponent = true

  getFormDataFromState(state: FormSubmissionState) {
    const name = this.name

    if (name in state) {
      return {
        [name]: this.getFormValueFromState(state)
      }
    }

    return undefined
  }

  getFormValueFromState(state: FormSubmissionState) {
    const name = this.name

    if (name in state) {
      return state[name] === null ? '' : state[name].toString()
    }
  }

  getStateFromValidForm(payload: FormPayload) {
    const name = this.name

    return {
      [name]: this.getStateValueFromValidForm(payload)
    }
  }

  getStateValueFromValidForm(payload: FormPayload) {
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
        err.text = capitalize(err.text)

        viewModel.errorMessage = {
          text: capitalize(err.text)
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
    return { [this.name]: this.formSchema }
  }

  getDisplayStringFromState(state) {
    return state[this.name] ?? ''
  }
}
