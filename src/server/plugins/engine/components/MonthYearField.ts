import { ComponentType, type MonthYearFieldComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import {
  DataType,
  type DateInputItem
} from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class MonthYearField extends FormComponent {
  declare options: MonthYearFieldComponent['options']
  children: ComponentCollection
  dataType: DataType = DataType.MonthYear

  constructor(def: MonthYearFieldComponent, model: FormModel) {
    super(def, model)

    const { name, options, title } = def
    const isRequired = options.required !== false

    this.children = new ComponentCollection(
      [
        {
          type: ComponentType.NumberField,
          name: `${name}__month`,
          title: 'Month',
          schema: { min: 1, max: 12 },
          options: {
            required: isRequired,
            classes: 'govuk-input--width-2',
            customValidationMessage: '{{#label}} must be between 1 and 12'
          }
        },
        {
          type: ComponentType.NumberField,
          name: `${name}__year`,
          title: 'Year',
          schema: { min: 1000, max: 3000 },
          options: {
            required: isRequired,
            classes: 'govuk-input--width-4'
          }
        }
      ],
      model
    )

    let { formSchema, stateSchema } = this.children

    // Update child schema
    formSchema = formSchema.label(title.toLowerCase())
    stateSchema = stateSchema.label(title.toLowerCase())

    this.options = options
    this.formSchema = formSchema
    this.stateSchema = stateSchema

    this.children.formSchema = formSchema
    this.children.stateSchema = stateSchema
  }

  getFormSchemaKeys() {
    return this.children.getFormSchemaKeys()
  }

  getStateSchemaKeys() {
    return {
      [this.name]: this.children.getStateSchemaKeys()
    }
  }

  getFormDataFromState(state: FormSubmissionState) {
    return this.children.getFormDataFromState(state)
  }

  getStateValueFromValidForm(payload: FormPayload) {
    return this.children.getStateFromValidForm(payload)
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const values = state[this.name]
    const year = values?.[`${this.name}__year`] ?? 'Not supplied'

    let monthString = 'Not supplied'
    const monthValue = values?.[`${this.name}__month`]
    if (monthValue) {
      const date = new Date()
      date.setMonth(monthValue - 1)
      monthString = date.toLocaleString('default', { month: 'long' })
    }

    return `${monthString} ${year}`
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { children, name } = this

    const viewModel = super.getViewModel(payload, errors)
    let { fieldset, label } = viewModel

    // Use the component collection to generate the subitems
    const items: DateInputItem[] = children
      .getViewModel(payload, errors)
      .map(({ model }) => {
        let { label, type, value, classes, errorMessage } = model

        if (label) {
          label.text = label.text.replace(optionalText, '')
          label.toString = () => label.text // Date component uses string labels
        }

        if (errorMessage) {
          classes = `${classes} govuk-input--error`.trim()
        }

        if (typeof value !== 'number') {
          value = undefined
        }

        return {
          label,
          id: model.id,
          name: model.name,
          type,
          value,
          classes
        }
      })

    // Filter errors for this component only
    const componentErrors = errors?.errorList.filter(
      (error) => error.name.startsWith(`${name}__`) // E.g. `${name}__year`
    )

    const errorMessage = componentErrors?.[0] && {
      text: componentErrors[0].text
    }

    fieldset ??= {
      legend: {
        text: label.text,
        classes: 'govuk-fieldset__legend--m'
      }
    }

    return {
      ...viewModel,
      errorMessage,
      fieldset,
      items
    }
  }
}
