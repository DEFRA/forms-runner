import { type ComponentDef } from '@defra/forms-model'
import { merge } from '@hapi/hoek'
import joi, { type Schema as JoiSchema } from 'joi'

import { type ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import * as Components from '~/src/server/plugins/engine/components/index.js'
import { type ComponentCollectionViewModel } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormData,
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class ComponentCollection {
  items: (ComponentBase | ComponentCollection | FormComponent)[]
  formItems: FormComponent /* | ConditionalFormComponent */[]
  prePopulatedItems: Record<string, JoiSchema>
  formSchema: JoiSchema
  stateSchema: JoiSchema

  constructor(componentDefs: ComponentDef[] = [], model: FormModel) {
    const components = componentDefs.map((def) => {
      const Comp = Components[def.type]

      if (typeof Comp !== 'function') {
        throw new Error(`Component type ${def.type} doesn't exist`)
      }

      return new Comp(def, model)
    })

    const formComponents = components.filter(
      (component) => 'isFormComponent' in component && component.isFormComponent
    )

    this.items = components
    this.formItems = formComponents
    this.formSchema = joi
      .object()
      .keys(this.getFormSchemaKeys())
      .required()
      .keys({ crumb: joi.string().optional().allow('') })

    this.stateSchema = joi.object().keys(this.getStateSchemaKeys()).required()
    this.prePopulatedItems = this.getPrePopulatedItems()
  }

  getFormSchemaKeys() {
    const keys = {}

    this.formItems.forEach((item) => {
      Object.assign(keys, item.getFormSchemaKeys())
    })

    return keys
  }

  getStateSchemaKeys() {
    const keys = {}

    this.formItems.forEach((item) => {
      Object.assign(keys, item.getStateSchemaKeys())
    })

    return keys
  }

  getPrePopulatedItems() {
    return this.formItems
      .filter(
        ({ options }) =>
          'allowPrePopulation' in options && options.allowPrePopulation
      )
      .map((item) => item.getStateSchemaKeys())
      .reduce((acc, curr) => merge(acc, curr), {})
  }

  getFormDataFromState(state: FormSubmissionState): any {
    const formData = {}

    this.formItems.forEach((item) => {
      Object.assign(formData, item.getFormDataFromState(state))
    })

    return formData
  }

  getStateFromValidForm(payload: FormPayload): Record<string, any> {
    const state = {}

    this.formItems.forEach((item) => {
      Object.assign(state, item.getStateFromValidForm(payload))
    })

    return state
  }

  getViewModel(
    formData: FormData | FormSubmissionState,
    errors?: FormSubmissionErrors,
    conditions?: FormModel['conditions']
  ): ComponentCollectionViewModel {
    const result = this.items.map((item) => {
      return {
        type: item.type,
        isFormComponent: 'isFormComponent' in item && item.isFormComponent,
        model: item.getViewModel(formData, errors)
      }
    })

    if (conditions) {
      return result.filter((item) =>
        'condition' in item.model
          ? conditions[item.model.condition]?.fn(formData)
          : true
      )
    }

    return result
  }
}
