import { type InputFieldsComponentsDef } from '@defra/forms-model'
import joi from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import * as helpers from '~/src/server/plugins/engine/components/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormData,
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class UkAddressField extends FormComponent {
  formChildren: ComponentCollection
  stateChildren: ComponentCollection

  constructor(def: InputFieldsComponentsDef, model: FormModel) {
    super(def, model)
    const { name, options } = this
    const stateSchema = helpers.buildStateSchema('date', this)
    const isRequired = !('required' in options && options.required === false)

    const childrenList: any = [
      {
        type: 'TextField',
        name: 'addressLine1',
        title: 'Address line 1',
        schema: { max: 100 },
        options: {
          autocomplete: 'address-line1',
          required: isRequired
        }
      },
      {
        type: 'TextField',
        name: 'addressLine2',
        title: 'Address line 2',
        schema: { max: 100, allow: '' },
        options: {
          autocomplete: 'address-line2',
          required: false
        }
      },
      {
        type: 'TextField',
        name: 'town',
        title: 'Town or city',
        schema: { max: 100 },
        options: {
          autocomplete: 'address-level2',
          classes: 'govuk-!-width-two-thirds',
          required: isRequired
        }
      },
      {
        type: 'TextField',
        name: 'postcode',
        title: 'Postcode',
        schema: { max: 10 },
        options: {
          autocomplete: 'postal-code',
          classes: 'govuk-input--width-10',
          required: isRequired
        }
      }
    ]

    const stateChildren = new ComponentCollection(childrenList, model)

    // Modify the name to add a prefix and reuse
    // the children to create the formComponents
    childrenList.forEach((child) => (child.name = `${name}__${child.name}`))

    const formChildren = new ComponentCollection(childrenList, model)

    this.formChildren = formChildren
    this.stateChildren = stateChildren
    this.stateSchema = stateSchema
  }

  getFormSchemaKeys() {
    return this.formChildren.getFormSchemaKeys()
  }

  getStateSchemaKeys() {
    const { name } = this
    const options: any = this.options

    return {
      [name]:
        options.required === false
          ? joi
              .object()
              .keys(this.stateChildren.getStateSchemaKeys())
              .allow(null)
          : joi
              .object()
              .keys(this.stateChildren.getStateSchemaKeys())
              .required()
    }
  }

  getFormDataFromState(state: FormSubmissionState) {
    const name = this.name
    const value = state[name]

    return {
      [`${name}__addressLine1`]: value?.addressLine1,
      [`${name}__addressLine2`]: value?.addressLine2,
      [`${name}__town`]: value?.town,
      [`${name}__postcode`]: value?.postcode
    }
  }

  getStateValueFromValidForm(payload: FormPayload) {
    const name = this.name
    return payload[`${name}__addressLine1`]
      ? {
          addressLine1: payload[`${name}__addressLine1`],
          addressLine2: payload[`${name}__addressLine2`],
          town: payload[`${name}__town`],
          postcode: payload[`${name}__postcode`]
        }
      : null
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const name = this.name
    const value = state[name]

    return value
      ? [value.addressLine1, value.addressLine2, value.town, value.postcode]
          .filter((p) => {
            return !!p
          })
          .join(', ')
      : ''
  }

  getViewModel(formData: FormData, errors?: FormSubmissionErrors) {
    const viewModel = {
      ...super.getViewModel(formData, errors),
      children: this.formChildren.getViewModel(formData, errors)
    }

    viewModel.fieldset = {
      legend: viewModel.label
    }

    return viewModel
  }
}
