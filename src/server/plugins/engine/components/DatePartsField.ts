import { parseISO, format } from 'date-fns'
import { InputFieldsComponentsDef } from '@defra/forms-model'

import { FormComponent } from './FormComponent.js'
import { ComponentCollection } from './ComponentCollection.js'
import { optionalText } from './constants.js'
import * as helpers from './helpers.js'
import {
  FormData,
  FormPayload,
  FormSubmissionErrors,
  FormSubmissionState
} from '../types.js'
import { FormModel } from '../models/index.js'
import type { DataType } from '../../../plugins/engine/components/types.js'

export class DatePartsField extends FormComponent {
  children: ComponentCollection
  dataType = 'date' as DataType

  constructor(def: InputFieldsComponentsDef, model: FormModel) {
    super(def, model)

    const { name, options } = this
    const isRequired = !('required' in options && options.required === false)
    const optionalText = 'optionalText' in options && options.optionalText
    this.children = new ComponentCollection(
      [
        {
          type: 'NumberField',
          name: `${name}__day`,
          title: 'Day',
          schema: { min: 1, max: 31 },
          options: {
            required: isRequired,
            optionalText,
            classes: 'govuk-input--width-2'
          },
          hint: ''
        },
        {
          type: 'NumberField',
          name: `${name}__month`,
          title: 'Month',
          schema: { min: 1, max: 12 },
          options: {
            required: isRequired,
            optionalText,
            classes: 'govuk-input--width-2'
          },
          hint: ''
        },
        {
          type: 'NumberField',
          name: `${name}__year`,
          title: 'Year',
          schema: { min: 1000, max: 3000 },
          options: {
            required: isRequired,
            optionalText,
            classes: 'govuk-input--width-4'
          },
          hint: ''
        }
      ],
      model
    )

    this.stateSchema = helpers.buildStateSchema('date', this)
  }

  getFormSchemaKeys() {
    return this.children.getFormSchemaKeys()
  }

  getStateSchemaKeys() {
    const { options } = this
    const { maxDaysInPast, maxDaysInFuture } = options as any
    let schema: any = this.stateSchema

    schema = schema.custom(
      helpers.getCustomDateValidator(maxDaysInPast, maxDaysInFuture)
    )

    return { [this.name]: schema }
  }

  getFormDataFromState(state: FormSubmissionState) {
    const name = this.name
    const value = state[name]
    const dateValue = new Date(value)

    return {
      [`${name}__day`]: value && dateValue.getDate(),
      [`${name}__month`]: value && dateValue.getMonth() + 1,
      [`${name}__year`]: value && dateValue.getFullYear()
    }
  }

  getStateValueFromValidForm(payload: FormPayload) {
    const name = this.name

    return payload[`${name}__year`]
      ? new Date(
          payload[`${name}__year`],
          payload[`${name}__month`] - 1,
          payload[`${name}__day`]
        )
      : null
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const name = this.name
    const value = state[name]
    return value ? format(parseISO(value), 'd MMMM yyyy') : ''
  }

  // @ts-expect-error - Property 'getViewModel' in type 'DatePartsField' is not assignable to the same property in base type 'FormComponent'
  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const viewModel = super.getViewModel(formData, errors)

    // Use the component collection to generate the subitems
    const componentViewModels = this.children
      .getViewModel(formData, errors)
      .map((vm) => vm.model)

    componentViewModels.forEach((componentViewModel) => {
      // Nunjucks macro expects label to be a string for this component
      componentViewModel.label = componentViewModel.label?.text?.replace(
        optionalText,
        ''
      ) as any

      if (componentViewModel.errorMessage) {
        componentViewModel.classes += ' govuk-input--error'
      }
    })

    const firstError = errors?.errorList?.[0]
    const errorMessage = firstError && { text: firstError?.text }

    return {
      ...viewModel,
      errorMessage,
      fieldset: {
        legend: viewModel.label
      },
      items: componentViewModels
    }
  }
}
