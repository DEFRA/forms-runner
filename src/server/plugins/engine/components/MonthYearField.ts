import { ComponentType, type MonthYearFieldComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import { type DataType } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class MonthYearField extends FormComponent {
  declare options: MonthYearFieldComponent['options']
  declare schema: MonthYearFieldComponent['schema']
  children: ComponentCollection
  dataType: DataType = 'monthYear'

  constructor(def: MonthYearFieldComponent, model: FormModel) {
    super(def, model)

    const { name, options, schema } = def
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

    this.options = options
    this.schema = schema
  }

  getFormSchemaKeys() {
    return this.children.getFormSchemaKeys()
  }

  getStateSchemaKeys() {
    return {
      [this.name]: this.children.getStateSchemaKeys()
    }
  }

  getFormDataFromState(state: FormSubmissionState<MonthYearState>) {
    return this.children.getFormDataFromState(state)
  }

  getStateValueFromValidForm(payload: FormPayload<MonthYearPayload>) {
    return this.children.getStateFromValidForm(payload)
  }

  getDisplayStringFromState(state: FormSubmissionState<MonthYearState>) {
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

  getViewModel(
    payload: FormPayload<MonthYearPayload>,
    errors?: FormSubmissionErrors
  ) {
    const { children, name } = this

    const viewModel = super.getViewModel(payload, errors)

    // Use the component collection to generate the subitems
    const componentViewModels = children
      .getViewModel(payload, errors)
      .map((vm) => vm.model)

    componentViewModels.forEach((componentViewModel) => {
      const { classes, label, errorMessage } = componentViewModel

      if (label) {
        label.text = label.text.replace(optionalText, '')
        label.toString = () => label.text // Date component uses string labels
      }

      if (errorMessage) {
        componentViewModel.classes = `${classes} govuk-input--error`.trim()
      }
    })

    // Filter errors for this component only
    const componentErrors = errors?.errorList.filter(
      (error) => error.name.startsWith(`${name}__`) // E.g. `${name}__year`
    )

    const errorMessage = componentErrors?.[0] && {
      text: componentErrors[0].text
    }

    let { fieldset, label } = viewModel

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
      items: componentViewModels
    }
  }
}

type MonthYearPayload = Record<string, string | undefined>
type MonthYearState = Record<string, string | null>
