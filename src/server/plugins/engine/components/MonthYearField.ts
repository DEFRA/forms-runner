import { ComponentType, type MonthYearFieldComponent } from '@defra/forms-model'
import { type ObjectSchema } from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  FormComponent,
  isFormState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { NumberField } from '~/src/server/plugins/engine/components/NumberField.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import {
  DataType,
  type DateInputItem
} from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionErrors,
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
    const hideOptional = options.optionalText

    this.children = new ComponentCollection(
      [
        {
          type: ComponentType.NumberField,
          name: `${name}__month`,
          title: 'Month',
          schema: { min: 1, max: 12, precision: 0 },
          options: {
            required: isRequired,
            optionalText: !isRequired && hideOptional,
            classes: 'govuk-input--width-2',
            customValidationMessage: `${title} must include a {{#label}}`
          }
        },
        {
          type: ComponentType.NumberField,
          name: `${name}__year`,
          title: 'Year',
          schema: { min: 1000, max: 3000, precision: 0 },
          options: {
            required: isRequired,
            optionalText: !isRequired && hideOptional,
            classes: 'govuk-input--width-4',
            customValidationMessage: `${title} must include a {{#label}}`
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

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { children, name } = this

    const viewModel = super.getViewModel(payload, errors)
    let { fieldset, label } = viewModel

    // Filter component and children errors only
    const componentErrors = errors?.errorList.filter(
      (error) =>
        error.name === name || // Errors for parent component only
        error.name.startsWith(`${name}__`) // Plus `${name}__year` etc fields
    )

    // Check for component errors only
    const hasError = componentErrors?.some((error) => error.name === name)

    // Use the component collection to generate the subitems
    const items: DateInputItem[] = children
      .getViewModel(payload, errors)
      .map(({ model }) => {
        let { label, type, value, classes, errorMessage } = model

        if (label) {
          label.text = label.text.replace(optionalText, '')
          label.toString = () => label.text // Date component uses string labels
        }

        if (hasError || errorMessage) {
          classes = `${classes} govuk-input--error`.trim()
        }

        if (!NumberField.isNumber(value)) {
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
