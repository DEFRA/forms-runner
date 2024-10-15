import { ComponentType, type UkAddressFieldComponent } from '@defra/forms-model'
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
  children: ComponentCollection

  constructor(def: UkAddressFieldComponent, model: FormModel) {
    super(def, model)

    const { name, options, title } = def

    const isRequired = options.required !== false
    const hideOptional = options.optionalText

    let stateSchema = joi.object().label(title).required()

    if (options.required === false) {
      stateSchema = stateSchema.allow(null)
    }

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
            optionalText: !isRequired && hideOptional
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
            optionalText: !isRequired && hideOptional
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
            optionalText: !isRequired && hideOptional
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
            optionalText: !isRequired && hideOptional
          }
        }
      ],
      model
    )

    this.options = options
    this.stateSchema = stateSchema
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const {
      [`${this.name}__addressLine1`]: addressLine1,
      [`${this.name}__addressLine2`]: addressLine2,
      [`${this.name}__town`]: town,
      [`${this.name}__postcode`]: postcode
    } = this.getFormDataFromState(state)

    return [addressLine1, addressLine2, town, postcode]
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
}
