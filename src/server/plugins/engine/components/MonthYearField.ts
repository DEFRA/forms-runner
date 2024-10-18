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
    const hideOptional = options.optionalText

    this.children = new ComponentCollection(
      [
        {
          type: ComponentType.NumberField,
          name: `${name}__month`,
          title: 'Month',
          schema: { min: 1, max: 12 },
          options: {
            required: isRequired,
            optionalText: !isRequired && hideOptional,
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
            optionalText: !isRequired && hideOptional,
            classes: 'govuk-input--width-4'
          }
        }
      ],
      model
    )

    this.options = options
    this.formSchema = this.children.formSchema.label(title)
    this.stateSchema = this.children.stateSchema.label(title)
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const { name } = this

    const values = this.getFormDataFromState(state)
    const month = values[`${name}__month`]
    const year = values[`${name}__year`]

    if (typeof month !== 'number' || typeof year !== 'number') {
      return ''
    }

    const date = new Date()
    date.setMonth(month - 1)

    const monthString = date.toLocaleString('default', { month: 'long' })
    return `${monthString} ${year}`
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { children, name } = this

    const viewModel = super.getViewModel(payload, errors)

    // Use the component collection to generate the subitems
    const componentViewModels = children
      .getViewModel(payload, errors)
      .map(({ model }): DateInputItem => {
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
