import {
  ComponentType,
  type DatePartsFieldFieldComponent
} from '@defra/forms-model'
import { parseISO, format } from 'date-fns'
import joi from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import { getCustomDateValidator } from '~/src/server/plugins/engine/components/helpers.js'
import { type DataType } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class DatePartsField extends FormComponent {
  declare options: DatePartsFieldFieldComponent['options']
  declare schema: DatePartsFieldFieldComponent['schema']
  children: ComponentCollection
  dataType: DataType = 'date'

  constructor(def: DatePartsFieldFieldComponent, model: FormModel) {
    super(def, model)

    const { name, options, schema, title } = def

    const isRequired = options.required !== false
    const hideOptional = options.optionalText

    let stateSchema = joi.date().label(title).required()

    if (options.required === false) {
      stateSchema = stateSchema.allow('', null).optional()
    }

    this.children = new ComponentCollection(
      [
        {
          type: ComponentType.NumberField,
          name: `${name}__day`,
          title: 'Day',
          schema: { min: 1, max: 31 },
          options: {
            required: isRequired,
            optionalText: !isRequired && hideOptional,
            classes: 'govuk-input--width-2'
          },
          hint: ''
        },
        {
          type: ComponentType.NumberField,
          name: `${name}__month`,
          title: 'Month',
          schema: { min: 1, max: 12 },
          options: {
            required: isRequired,
            optionalText: !isRequired && hideOptional,
            classes: 'govuk-input--width-2'
          },
          hint: ''
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
          },
          hint: ''
        }
      ],
      model
    )

    this.options = options
    this.schema = schema
    this.stateSchema = stateSchema
  }

  getFormSchemaKeys() {
    return this.children.getFormSchemaKeys()
  }

  getStateSchemaKeys() {
    const { options } = this
    const { maxDaysInPast, maxDaysInFuture } = options
    let schema = this.stateSchema

    schema = schema.custom(
      getCustomDateValidator(maxDaysInPast, maxDaysInFuture)
    )

    return { [this.name]: schema }
  }

  getFormDataFromState(state: FormSubmissionState<DatePartsState>) {
    const { name } = this

    const value = state[name]

    const date = typeof value === 'string' ? new Date(value) : undefined

    const day = date ? date.getDate() : ''
    const month = date ? date.getMonth() + 1 : ''
    const year = date ? date.getFullYear() : ''

    return {
      [`${name}__day`]: day,
      [`${name}__month`]: month,
      [`${name}__year`]: year
    }
  }

  getStateValueFromValidForm(payload: FormPayload<DatePartsPayload>) {
    const { name } = this

    const day = payload[`${name}__day`]
    const month = payload[`${name}__month`]
    const year = payload[`${name}__year`]

    if (
      typeof day !== 'number' ||
      typeof month !== 'number' ||
      typeof year !== 'number'
    ) {
      return null
    }

    return new Date(year, month - 1, day)
  }

  getDisplayStringFromState(state: FormSubmissionState<DatePartsState>) {
    const { name } = this
    const value = state[name]

    return typeof value === 'string'
      ? format(parseISO(value), 'd MMMM yyyy')
      : ''
  }

  getConditionEvaluationStateValue(state: FormSubmissionState<DatePartsState>) {
    const { name } = this
    const value = state[name]

    return typeof value === 'string'
      ? format(parseISO(value), 'yyyy-MM-dd')
      : '' // strip the time as it interferes with equals/not equals
  }

  getViewModel(
    payload: FormPayload<DatePartsPayload>,
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

export type DatePartsPayload = Record<string, number | undefined>
export type DatePartsState = Record<string, number | null>
