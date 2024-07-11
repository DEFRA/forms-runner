import {
  ComponentType,
  type InputFieldsComponentsDef
} from '@defra/forms-model'
import { parseISO, format } from 'date-fns'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import {
  buildStateSchema,
  getCustomDateValidator
} from '~/src/server/plugins/engine/components/helpers.js'
import { type DataType } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class DatePartsField extends FormComponent {
  children: ComponentCollection
  dataType = 'date' as DataType

  constructor(def: InputFieldsComponentsDef, model: FormModel) {
    super(def, model)

    const { name, options } = this

    const isRequired = !('required' in options && options.required === false)
    const hideOptional = 'optionalText' in options && options.optionalText

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

    this.stateSchema = buildStateSchema('date', this)
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

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(payload, errors)

    // Use the component collection to generate the subitems
    const componentViewModels = this.children
      .getViewModel(payload, errors)
      .map((vm) => vm.model)

    componentViewModels.forEach((componentViewModel) => {
      // Nunjucks macro expects label to be a string for this component
      componentViewModel.label = componentViewModel.label?.text.replace(
        optionalText,
        ''
      )

      if (componentViewModel.errorMessage) {
        componentViewModel.classes += ' govuk-input--error'
      }
    })

    const firstError = errors?.errorList[0]
    const errorMessage = firstError && { text: firstError.text }

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
