import { type ListComponentsDef, type List } from '@defra/forms-model'
import joi, { type Schema } from 'joi'

import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import * as helpers from '~/src/server/plugins/engine/components/helpers.js'
import { addClassOptionIfNone } from '~/src/server/plugins/engine/components/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

/**
 * @description
 * YesNoField is a radiosField with predefined values.
 */
export class YesNoField extends ListFormComponent {
  list?: List = {
    name: '__yesNo',
    title: 'Yes/No',
    type: 'boolean',
    items: [
      {
        text: 'Yes',
        value: true
      },
      {
        text: 'No',
        value: false
      }
    ]
  }

  itemsSchema = joi.boolean()
  get items() {
    return this.list?.items ?? []
  }

  get values() {
    return [true, false]
  }

  constructor(def: ListComponentsDef, model: FormModel) {
    super(def, model)

    const { options } = this

    this.formSchema = helpers
      .buildFormSchema('boolean', this, options.required !== false)
      .valid(true, false)
    this.stateSchema = helpers
      .buildStateSchema(this.list?.type, this)
      .valid(true, false)

    addClassOptionIfNone(this.options, 'govuk-radios--inline')
  }

  getFormSchemaKeys() {
    return { [this.name]: this.formSchema as Schema }
  }

  getStateSchemaKeys() {
    return { [this.name]: this.stateSchema as Schema }
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const value = state[this.name]
    const item = this.items.find((item) => item.value === value)
    return item?.text ?? ''
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const { name } = this

    const viewModel = super.getViewModel(payload, errors)
    let { fieldset, items, label } = viewModel

    fieldset ??= {
      legend: {
        text: label.text,
        classes: 'govuk-fieldset__legend--m'
      }
    }

    items = items?.map(({ text, value }) => ({
      text,
      value,
      checked: `${value}` === `${payload[name]}`
    }))

    return {
      ...viewModel,
      fieldset,
      items
    }
  }
}
