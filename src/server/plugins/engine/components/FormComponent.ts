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
  type FormData,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionErrors,
  type FormSubmissionState
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

  getFormDataFromState(state: FormSubmissionState): FormData {
    const { children, name } = this

    if (children) {
      return children.getFormDataFromState(state)
    }

    if (
      state[name] === null ||
      (typeof state[name] !== 'string' &&
        typeof state[name] !== 'number' &&
        typeof state[name] !== 'boolean')
    ) {
      return {}
    }

    return {
      [name]: state[name]
    }
  }

  getStateFromValidForm(payload: FormPayload): FormState {
    const { children, name } = this

    if (children) {
      return children.getStateFromValidForm(payload)
    }

    return {
      [name]: this.getStateValueFromValidForm(payload)
    }
  }

  getStateValueFromValidForm(payload: FormPayload): FormStateValue {
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
    const { children, name, formSchema } = this

    if (children) {
      return children.getFormSchemaKeys()
    }

    return {
      [name]: formSchema
    }
  }

  getStateSchemaKeys(): ComponentSchemaKeys {
    const { children, name, stateSchema } = this

    if (children) {
      return children.getStateSchemaKeys()
    }

    return {
      [name]: stateSchema
    }
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const { name } = this
    return typeof state[name] === 'string' ? state[name] : ''
  }

  getMarkdownStringFromState(state: FormSubmissionState) {
    const formatted = this.getDisplayStringFromState(state)
    return `\`\`\`\n${formatted}\n\`\`\``
  }
}
