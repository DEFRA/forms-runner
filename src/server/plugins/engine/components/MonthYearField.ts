import { ComponentType, type MonthYearFieldComponent } from '@defra/forms-model'
import { type CustomValidator, type ObjectSchema } from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  FormComponent,
  isFormState,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { NumberField } from '~/src/server/plugins/engine/components/NumberField.js'
import {
  DataType,
  type DateInputItem
} from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class MonthYearField extends FormComponent {
  declare options: MonthYearFieldComponent['options']
  declare formSchema: ObjectSchema<FormPayload>
  declare stateSchema: ObjectSchema<FormState>

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
          schema: { min: 1, max: 12, precision: 0 },
          options: {
            required: isRequired,
            optionalText: true,
            classes: 'govuk-input--width-2',
            customValidationMessage: messageTemplate.objectMissing
              .replace('{{#title}}', title)
              .replace('{{#missingWithLabels}}', 'month')
          }
        },
        {
          type: ComponentType.NumberField,
          name: `${name}__year`,
          title: 'Year',
          schema: { min: 1000, max: 3000, precision: 0 },
          options: {
            required: isRequired,
            optionalText: true,
            classes: 'govuk-input--width-4',
            customValidationMessage: messageTemplate.objectMissing
              .replace('{{#title}}', title)
              .replace('{{#missingWithLabels}}', 'year')
          }
        }
      ],
      { model, parent: this },
      {
        peers: [`${name}__month`, `${name}__year`],
        custom: getValidatorMonthYear(this)
      }
    )

    this.options = options
    this.formSchema = this.children.formSchema
    this.stateSchema = this.children.stateSchema
  }

  getFormValueFromState(state: FormSubmissionState) {
    const value = super.getFormValueFromState(state)
    return MonthYearField.isMonthYear(value) ? value : undefined
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)

    if (!value) {
      return ''
    }

    const date = new Date()
    date.setMonth(value.month - 1)

    const monthString = date.toLocaleString('default', { month: 'long' })
    return `${monthString} ${value.year}`
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const { children, name } = this

    const viewModel = super.getViewModel(payload, errors)
    let { fieldset, label } = viewModel

    // Filter component and child errors only
    const componentErrors = errors?.filter(
      (error) =>
        error.path.includes(name) || // Errors for parent component
        error.name.startsWith(`${name}__`) // Plus `${name}__year` etc fields
    )

    // Check for component errors only
    const hasError = componentErrors?.some((error) => error.path.includes(name))

    // Use the component collection to generate the subitems
    const items: DateInputItem[] = children
      .getViewModel(payload, errors)
      .map(({ model }) => {
        let { label, type, value, classes, errorMessage } = model

        if (label) {
          label.toString = () => label.text // Date component uses string labels
        }

        if (hasError || errorMessage) {
          classes = `${classes} govuk-input--error`.trim()
        }

        // Allow any `toString()`-able value so non-numeric
        // values are shown alongside their error messages
        if (!isFormValue(value)) {
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

  isState(value?: FormStateValue | FormState) {
    return MonthYearField.isMonthYear(value)
  }

  static isMonthYear(
    value?: FormStateValue | FormState
  ): value is MonthYearState {
    return (
      isFormState(value) &&
      NumberField.isNumber(value.month) &&
      NumberField.isNumber(value.year)
    )
  }
}

interface MonthYearState extends Record<string, number> {
  month: number
  year: number
}

export function getValidatorMonthYear(component: MonthYearField) {
  const validator: CustomValidator = (payload: FormPayload, helpers) => {
    const { name, options } = component

    const values = component.getFormValueFromState(
      component.getStateFromValidForm(payload)
    )

    if (!component.isState(values)) {
      return options.required !== false
        ? helpers.error('object.required', { key: name })
        : payload
    }

    return payload
  }

  return validator
}
