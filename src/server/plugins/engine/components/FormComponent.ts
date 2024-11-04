import { type FormComponentsDef } from '@defra/forms-model'
import upperFirst from 'lodash/upperFirst.js'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
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
  type: FormComponentsDef['type']
  hint: FormComponentsDef['hint']
  children: ComponentCollection | undefined

  isFormComponent = true

  constructor(def: FormComponentsDef, model: FormModel) {
    super(def, model)

    const { hint, type } = def

    this.type = type
    this.hint = hint
  }

  getFormDataFromState(state: FormSubmissionState): FormPayload {
    const { children, name } = this

    if (children) {
      return children.getFormDataFromState(state)
    }

    const value = state[name]

    return {
      [name]: this.isValue(value) ? value : undefined
    }
  }

  getFormValueFromState(state: FormSubmissionState): FormValue | FormPayload {
    const { children, name } = this

    if (children) {
      return children.getFormValueFromState(state)
    }

    const value = state[name]
    return this.isValue(value) ? value : undefined
  }

  getStateFromValidForm(payload: FormPayload): FormState {
    const { children, name } = this

    if (children) {
      return children.getStateFromValidForm(payload)
    }

    const value = payload[name]

    return {
      [name]: this.isValue(value) ? value : null
    }
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

  getDisplayStringFromState(state: FormSubmissionState): string {
    const value = this.getFormValueFromState(state)
    return this.isValue(value) ? value.toString() : ''
  }

  getConditionEvaluationStateValue(
    state: FormSubmissionState
  ): FormStateValue | FormState {
    return this.getFormValueFromState(state) ?? null
  }

  isValue(
    value?: FormStateValue | FormState
  ): value is NonNullable<FormStateValue> {
    return isFormValue(value)
  }

  isState(value?: FormStateValue | FormState): value is FormState {
    return isFormState(value)
  }
}

/**
 * Check for form value
 */
export function isFormValue(
  value?: unknown
): value is string | number | boolean {
  return (
    (typeof value === 'string' && value.length > 0) ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

/**
 * Check for form state with nested values
 */
export function isFormState(value?: unknown): value is FormState {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  // Skip empty objects
  return !!Object.values(value).length
}
