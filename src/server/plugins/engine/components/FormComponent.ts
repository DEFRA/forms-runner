import joi, { type Schema } from 'joi'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import {
  type FormSubmissionState,
  type FormSubmissionErrors,
  type FormData,
  type FormPayload
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

    return name in payload && payload[name] !== '' ? payload[name] : null
  }

  getViewModel(formData: FormData, errors?: FormSubmissionErrors) {
    const { hint, name, options, title } = this

    const viewModel = super.getViewModel(formData, errors)

    const isRequired = !('required' in options && options.required === false)
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
      value: formData[name]
    }
  }

  getFormSchemaKeys() {
    return { [this.name]: joi.any() }
  }

  getStateSchemaKeys(): Record<string, Schema> {
    return { [this.name]: joi.any() }
  }

  getDisplayStringFromState(state) {
    return state[this.name]
  }
}
