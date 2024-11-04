import { ComponentType, type UkAddressFieldComponent } from '@defra/forms-model'
import { type ObjectSchema } from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  FormComponent,
  isFormState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type PageControllerBase } from '~/src/server/plugins/engine/pageControllers/PageControllerBase.js'
import {
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class UkAddressField extends FormComponent {
  declare options: UkAddressFieldComponent['options']
  children: ComponentCollection

  declare formSchema: ObjectSchema<FormPayload>
  declare stateSchema: ObjectSchema<FormState>

  constructor(def: UkAddressFieldComponent, model: FormModel) {
    super(def, model)

    const { name, options } = def

    const isRequired = options.required !== false
    const hideOptional = !!options.optionalText
    const hideTitle = !!options.hideTitle

    this.children = new ComponentCollection(
      [
        {
          type: ComponentType.TextField,
          name: `${name}__addressLine1`,
          title: 'Address line 1',
          schema: { max: 100 },
          options: {
            autocomplete: 'address-line1',
            required: isRequired,
            optionalText: !isRequired && (hideOptional || !hideTitle)
          }
        },
        {
          type: ComponentType.TextField,
          name: `${name}__addressLine2`,
          title: 'Address line 2',
          schema: { max: 100 },
          options: {
            autocomplete: 'address-line2',
            required: false,
            optionalText: !isRequired && (hideOptional || !hideTitle)
          }
        },
        {
          type: ComponentType.TextField,
          name: `${name}__town`,
          title: 'Town or city',
          schema: { max: 100 },
          options: {
            autocomplete: 'address-level2',
            classes: 'govuk-!-width-two-thirds',
            required: isRequired,
            optionalText: !isRequired && (hideOptional || !hideTitle)
          }
        },
        {
          type: ComponentType.TextField,
          name: `${name}__postcode`,
          title: 'Postcode',
          schema: {
            regex: '^[a-zA-Z]{1,2}\\d[a-zA-Z\\d]?\\s?\\d[a-zA-Z]{2}$'
          },
          options: {
            autocomplete: 'postal-code',
            classes: 'govuk-input--width-10',
            required: isRequired,
            optionalText: !isRequired && (hideOptional || !hideTitle)
          }
        }
      ],
      { model }
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
    return Object.values(this.getFormValueFromState(state) ?? {})
      .filter(Boolean)
      .join(', ')
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { children: formChildren, name, options } = this

    const viewModel = super.getViewModel(payload, errors)
    let { children, fieldset, hint, label } = viewModel

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

    if (hint) {
      hint.id ??= `${name}-hint`
      fieldset.attributes ??= {
        'aria-describedby': hint.id
      }
    }

    children = formChildren.getViewModel(payload, errors)

    return {
      ...viewModel,
      fieldset,
      children
    }
  }

  isState(value?: FormStateValue | FormState): value is UkAddressState {
    return UkAddressField.isUkAddress(value)
  }

  static isUkAddress(
    value?: FormStateValue | FormState
  ): value is UkAddressState {
    return (
      isFormState(value) &&
      TextField.isText(value.addressLine1) &&
      TextField.isText(value.town) &&
      TextField.isText(value.postcode)
    )
  }
}

interface UkAddressState extends Record<string, string> {
  addressLine1: string
  addressLine2: string
  town: string
  postcode: string
}
