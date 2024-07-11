import { type ComponentDef } from '@defra/forms-model'
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

  getFormDataFromState(state: FormSubmissionState): FormData {
    const payload = {}

    this.formItems.forEach((item) => {
      Object.assign(payload, item.getFormDataFromState(state))
    })

    return payload
  }

  getStateFromValidForm(payload: FormPayload) {
    const state = {}

    this.formItems.forEach((item) => {
      Object.assign(state, item.getStateFromValidForm(payload))
    })

    return state
  }

  getViewModel(
    payload: FormPayload,
    errors?: FormSubmissionErrors,
    conditions?: FormModel['conditions']
  ): ComponentCollectionViewModel {
    const result = this.items.map((item) => {
      return {
        type: 'type' in item ? item.type : undefined,
        isFormComponent: 'isFormComponent' in item && item.isFormComponent,
        model: item.getViewModel(payload, errors)
      }
    })

    if (conditions) {
      return result.filter((item) =>
        'condition' in item.model
          ? conditions[item.model.condition]?.fn(payload)
          : true
      )
    }

    return result
  }
}
