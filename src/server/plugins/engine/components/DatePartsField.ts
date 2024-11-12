import { ComponentType, type DatePartsFieldComponent } from '@defra/forms-model'
import { add, format, isValid, parse, startOfToday, sub } from 'date-fns'
import {
  type CustomValidator,
  type LanguageMessages,
  type ObjectSchema
} from 'joi'

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

export class DatePartsField extends FormComponent {
  declare options: DatePartsFieldComponent['options']
  declare formSchema: ObjectSchema<FormPayload>
  declare stateSchema: ObjectSchema<FormState>

  children: ComponentCollection
  dataType: DataType = DataType.Date

  constructor(def: DatePartsFieldComponent, model: FormModel) {
    super(def, model)

    const { name, options } = def

    const isRequired = options.required !== false

    const customValidationMessages: LanguageMessages = {
      'any.required': messageTemplate.objectMissing,
      'number.base': messageTemplate.objectMissing,
      'number.precision': messageTemplate.dateFormat,
      'number.integer': messageTemplate.dateFormat,
      'number.unsafe': messageTemplate.dateFormat,
      'number.min': messageTemplate.dateFormat,
      'number.max': messageTemplate.dateFormat
    }

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
            customValidationMessages
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
            customValidationMessages
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
            customValidationMessages
          }
        }
      ],
      { model, parent: this },
      {
        custom: getValidatorDate(this),
        messages: customValidationMessages,
        peers: [`${name}__day`, `${name}__month`, `${name}__year`]
      }
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
    const { name, options } = component

    const values = component.getFormValueFromState(
      component.getStateFromValidForm(payload)
    )

    if (!component.isState(values)) {
      return options.required !== false
        ? helpers.error('object.required', { key: name })
        : payload
    }

    const date = parse(
      `${values.year}-${values.month}-${values.day}`,
      'yyyy-MM-dd',
      new Date()
    )

    if (!isValid(date)) {
      return helpers.error('date.format', { key: name })
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
      return helpers.error('date.min', { key: name, limit: dateMin })
    }

    if (dateMax && date > dateMax) {
      return helpers.error('date.max', { key: name, limit: dateMax })
    }

    return payload
  }

  return validator
}
