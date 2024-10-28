import { ComponentType, type DatePartsFieldComponent } from '@defra/forms-model'
import {
  add,
  format,
  isValid,
  parse,
  parseISO,
  startOfToday,
  sub
} from 'date-fns'
import { type CustomValidator } from 'joi'

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

export class DatePartsField extends FormComponent {
  declare options: DatePartsFieldComponent['options']
  children: ComponentCollection
  dataType: DataType = DataType.Date

  constructor(def: DatePartsFieldComponent, model: FormModel) {
    super(def, model)

    const { name, options, title } = def

    const isRequired = options.required !== false
    const hideOptional = options.optionalText

    this.children = new ComponentCollection(
      [
        {
          type: ComponentType.NumberField,
          name: `${name}__day`,
          title: 'Day',
          schema: { min: 1, max: 31, precision: 0 },
          options: {
            required: isRequired,
            optionalText: !isRequired && hideOptional,
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
    formSchema = formSchema
      .custom(getValidatorDate(this), 'date validation')
      .label(title.toLowerCase())

    stateSchema = stateSchema
      .custom(getValidatorDate(this), 'date validation')
      .label(title.toLowerCase())

    this.options = options
    this.formSchema = formSchema
    this.stateSchema = stateSchema

    this.children.formSchema = formSchema
    this.children.stateSchema = stateSchema
  }

  getFormDataFromState(state: FormSubmissionState) {
    const { name } = this

    let day: number | undefined
    let month: number | undefined
    let year: number | undefined

    if (typeof state[name] === 'string') {
      const value = new Date(state[name])

      if (isValid(value)) {
        day = value.getDate()
        month = value.getMonth() + 1
        year = value.getFullYear()
      }
    }

    return {
      [`${name}__day`]: day,
      [`${name}__month`]: month,
      [`${name}__year`]: year
    }
  }

  getStateValueFromValidForm(payload: FormPayload) {
    const { name } = this

    const {
      [`${name}__day`]: day,
      [`${name}__month`]: month,
      [`${name}__year`]: year
    } = payload

    const value = parse(`${year}-${month}-${day}`, 'yyyy-MM-dd', new Date())
    return isValid(value) ? value.toISOString() : null
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const value = state[this.name]
    return value ? format(parseISO(value), 'd MMMM yyyy') : ''
  }

  getConditionEvaluationStateValue(state: FormSubmissionState): string {
    const value = state[this.name]
    return value ? format(parseISO(value), 'yyyy-MM-dd') : '' // strip the time as it interferes with equals/not equals
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

export function getValidatorDate(component: DatePartsField) {
  const { options } = component

  const validator: CustomValidator = (payload: FormPayload, helpers) => {
    const value = component.getStateValueFromValidForm(payload)
    const date = value ? new Date(value) : undefined

    if (!date) {
      return options.required !== false
        ? helpers.error('date.base') // Date required
        : payload
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
      return helpers.error('date.min', {
        label: helpers.state.key,
        limit: dateMin
      })
    }

    if (dateMax && date > dateMax) {
      return helpers.error('date.max', {
        label: helpers.state.key,
        limit: dateMax
      })
    }

    return payload
  }

  return validator
}
