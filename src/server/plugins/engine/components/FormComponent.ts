import { type FormComponentsDef, type Item } from '@defra/forms-model'

import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import {
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState,
  type FormValue
} from '~/src/server/plugins/engine/types.js'

export class FormComponent extends ComponentBase {
  type: FormComponentsDef['type']
  hint: FormComponentsDef['hint']

  isFormComponent = true

  constructor(
    def: FormComponentsDef,
    props: ConstructorParameters<typeof ComponentBase>[1]
  ) {
    super(def, props)

    const { hint, type } = def

    this.type = type
    this.hint = hint
  }

  get keys() {
    const { collection, name } = this

    if (collection) {
      const { fields } = collection
      return [name, ...fields.map(({ name }) => name)]
    }

    return [name]
  }

  getFormDataFromState(state: FormSubmissionState): FormPayload {
    const { collection, name } = this

    if (collection) {
      return collection.getFormDataFromState(state)
    }

    const value = state[name]

    return {
      [name]: this.isValue(value) ? value : undefined
    }
  }

  getFormValueFromState(state: FormSubmissionState): FormValue | FormPayload {
    const { collection, name } = this

    if (collection) {
      return collection.getFormValueFromState(state)
    }

    const value = state[name]
    return this.isValue(value) ? value : undefined
  }

  getStateFromValidForm(payload: FormPayload): FormState {
    const { collection, name } = this

    if (collection) {
      return collection.getStateFromValidForm(payload)
    }

    const value = payload[name]

    return {
      [name]: this.isValue(value) ? value : null
    }
  }

  getErrors(errors?: FormSubmissionError[]): FormSubmissionError[] | undefined {
    const { name } = this

    // Filter component and child errors only
    const list = errors?.filter(
      (error) =>
        error.name === name ||
        error.path.includes(name) ||
        this.keys.includes(error.name)
    )

    if (!list?.length) {
      return
    }

    return list
  }

  getError(errors?: FormSubmissionError[]): FormSubmissionError | undefined {
    return this.getErrors(errors)?.[0]
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
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

    // Filter component errors only
    const componentErrors = this.getErrors(errors)
    const componentError = this.getError(componentErrors)

    if (componentErrors) {
      viewModel.errors = componentErrors
    }

    if (componentError) {
      viewModel.errorMessage = {
        text: componentError.text
      }
    }

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

  getContextValueFromState(
    state: FormSubmissionState
  ): Item['value'] | Item['value'][] | null {
    const value = this.getFormValueFromState(state)

    // Filter object field values
    if (this.isState(value)) {
      const values = Object.values(value).filter(isFormValue)
      return values.length ? values : null
    }

    // Filter array field values
    if (this.isValue(value) && Array.isArray(value)) {
      return value.filter(isFormValue)
    }

    return this.isValue(value) ? value : null
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
