import {
  ComponentType,
  type ComponentDef,
  type UkAddressFieldComponent
} from '@defra/forms-model'
import joi from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type PageControllerBase } from '~/src/server/plugins/engine/pageControllers/PageControllerBase.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class UkAddressField extends FormComponent {
  declare options: UkAddressFieldComponent['options']
  declare schema: UkAddressFieldComponent['schema']
  children: ComponentCollection
  stateChildren: ComponentCollection

  constructor(def: UkAddressFieldComponent, model: FormModel) {
    super(def, model)

    const { name, options, schema, title } = def

    const isRequired = options.required !== false
    const hideOptional = options.optionalText

    let stateSchema = joi.object().label(title).required()

    if (options.required === false) {
      stateSchema = stateSchema.allow('', null).optional()
    }

    const childrenList = [
      {
        type: ComponentType.TextField,
        name: 'addressLine1',
        title: 'Address line 1',
        schema: { max: 100 },
        options: {
          autocomplete: 'address-line1',
          required: isRequired,
          optionalText: !isRequired && hideOptional
        }
      },
      {
        type: ComponentType.TextField,
        name: 'addressLine2',
        title: 'Address line 2',
        schema: { max: 100 },
        options: {
          autocomplete: 'address-line2',
          required: false,
          optionalText: !isRequired && hideOptional
        }
      },
      {
        type: ComponentType.TextField,
        name: 'town',
        title: 'Town or city',
        schema: { max: 100 },
        options: {
          autocomplete: 'address-level2',
          classes: 'govuk-!-width-two-thirds',
          required: isRequired,
          optionalText: !isRequired && hideOptional
        }
      },
      {
        type: ComponentType.TextField,
        name: 'postcode',
        title: 'Postcode',
        schema: {
          regex: '^[a-zA-Z]{1,2}\\d[a-zA-Z\\d]?\\s?\\d[a-zA-Z]{2}$'
        },
        options: {
          autocomplete: 'postal-code',
          classes: 'govuk-input--width-10',
          required: isRequired,
          optionalText: !isRequired && hideOptional
        }
      }
    ] satisfies ComponentDef[]

    const stateChildren = new ComponentCollection(childrenList, model)

    // Modify the name to add a prefix and reuse
    // the children to create the formComponents
    childrenList.forEach((child) => (child.name = `${name}__${child.name}`))

    const formChildren = new ComponentCollection(childrenList, model)

    this.options = options
    this.schema = schema
    this.children = formChildren
    this.stateChildren = stateChildren
    this.stateSchema = stateSchema
  }

  getFormSchemaKeys() {
    return this.children.getFormSchemaKeys()
  }

  getStateSchemaKeys() {
    const { name } = this
    const options = this.options

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

  getFormDataFromState(state: FormSubmissionState<UkAddressState>) {
    const { name } = this
    const value = state[name]

    return {
      [`${name}__addressLine1`]: value?.addressLine1 ?? '',
      [`${name}__addressLine2`]: value?.addressLine2 ?? '',
      [`${name}__town`]: value?.town ?? '',
      [`${name}__postcode`]: value?.postcode ?? ''
    }
  }

  getStateValueFromValidForm(payload: FormPayload<UkAddressPayload>) {
    const { name } = this

    return payload[`${name}__addressLine1`]
      ? {
          addressLine1: payload[`${name}__addressLine1`] ?? '',
          addressLine2: payload[`${name}__addressLine2`] ?? '',
          town: payload[`${name}__town`] ?? '',
          postcode: payload[`${name}__postcode`] ?? ''
        }
      : null
  }

  getDisplayStringFromState(state: FormSubmissionState<UkAddressState>) {
    const { name } = this
    const value = state[name]

    return value
      ? [value.addressLine1, value.addressLine2, value.town, value.postcode]
          .filter((p) => {
            return !!p
          })
          .join(', ')
      : ''
  }

  getViewModel(
    payload: FormPayload<UkAddressPayload>,
    errors?: FormSubmissionErrors
  ) {
    const { children: formChildren, options } = this

    const viewModel = super.getViewModel(payload, errors)
    let { children, fieldset, label } = viewModel

    fieldset ??= {
      legend: {
        text: label.text,

        /**
         * For screen readers, only hide legend visually. This can be overridden
         * by single component {@link PageControllerBase | `showTitle` handling}
         */
        classes: options.hideTitle
          ? 'govuk-visually-hidden'
          : 'govuk-fieldset__legend--m'
      }
    }

    children = formChildren.getViewModel(payload, errors)

    return {
      ...viewModel,
      fieldset,
      children
    }
  }
}

export type UkAddressPayload = Record<string, string | undefined>
export type UkAddressState = Record<string, Record<string, string> | null>
