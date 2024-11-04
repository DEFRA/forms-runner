import { ComponentType, type DatePartsFieldComponent } from '@defra/forms-model'
import { add, format, isValid, parse, startOfToday, sub } from 'date-fns'
import { type CustomValidator, type ObjectSchema } from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  FormComponent,
  isFormState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { NumberField } from '~/src/server/plugins/engine/components/NumberField.js'
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

export class DatePartsField extends FormComponent {
  declare options: DatePartsFieldComponent['options']
  declare formSchema: ObjectSchema<FormPayload>
  declare stateSchema: ObjectSchema<FormState>

  children: ComponentCollection
  dataType: DataType = DataType.Date

  constructor(def: DatePartsFieldComponent, model: FormModel) {
    super(def, model)

    const { name, options, title } = def

    const isRequired = options.required !== false

    this.children = new ComponentCollection(
      [
        {
          type: ComponentType.NumberField,
          name: `${name}__day`,
          title: 'Day',
          schema: { min: 1, max: 31, precision: 0 },
          options: {
            required: isRequired,
            optionalText: true,
            classes: 'govuk-input--width-2',
            customValidationMessage: `${title} must include a {{#label}}`
          }
        },
        {
          type: ComponentType.NumberField,
          name: `${name}__month`,
          title: 'Month',
          schema: { min: 1, max: 12, precision: 0 },
          options: {
            required: isRequired,
            optionalText: true,
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
            optionalText: true,
            classes: 'govuk-input--width-4',
            customValidationMessage: `${title} must include a {{#label}}`
          }
        }
      ],
      { model, parent: this },
      { custom: getValidatorDate(this) }
    )

    this.options = options
    this.formSchema = this.children.formSchema
    this.stateSchema = this.children.stateSchema
  }

  getFormValueFromState(state: FormSubmissionState) {
    const value = super.getFormValueFromState(state)
    return this.isState(value) ? value : undefined
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)

    if (!value) {
      return ''
    }

    return format(`${value.year}-${value.month}-${value.day}`, 'd MMMM yyyy')
  }

  getConditionEvaluationStateValue(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)

    if (!value) {
      return null
    }

    return format(`${value.year}-${value.month}-${value.day}`, 'yyyy-MM-dd')
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { children, name } = this

    const viewModel = super.getViewModel(payload, errors)
    let { fieldset, label } = viewModel

    // Filter component and child errors only
    const componentErrors = errors?.errorList.filter(
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
    return DatePartsField.isDateParts(value)
  }

  static isDateParts(
    value?: FormStateValue | FormState
  ): value is DatePartsState {
    return (
      isFormState(value) &&
      NumberField.isNumber(value.day) &&
      NumberField.isNumber(value.month) &&
      NumberField.isNumber(value.year)
    )
  }
}

interface DatePartsState extends Record<string, number> {
  day: number
  month: number
  year: number
}

export function getValidatorDate(component: DatePartsField) {
  const validator: CustomValidator = (payload: FormPayload, helpers) => {
    const { children, options } = component

    const values = component.getFormValueFromState(
      component.getStateFromValidForm(payload)
    )

    if (!DatePartsField.isDateParts(values)) {
      return options.required !== false
        ? children.error(helpers, 'date.base') // Date required
        : payload
    }

    const date = parse(
      `${values.year}-${values.month}-${values.day}`,
      'yyyy-MM-dd',
      new Date()
    )

    if (!isValid(date)) {
      return children.error(helpers, 'date.format')
    }

    // Minimum date from today
    const dateMin = options.maxDaysInPast
      ? sub(startOfToday(), { days: options.maxDaysInPast })
      : undefined

    // Maximum date from today
    const dateMax = options.maxDaysInFuture
      ? add(startOfToday(), { days: options.maxDaysInFuture })
      : undefined

    if (dateMin && date < dateMin) {
      return children.error(helpers, 'date.min', { limit: dateMin })
    }

    if (dateMax && date > dateMax) {
      return children.error(helpers, 'date.max', { limit: dateMax })
    }

    return payload
  }

  return validator
}
