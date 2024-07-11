import { type ComponentDef } from '@defra/forms-model'
import joi from 'joi'

import {
  type ComponentSchema,
  type ComponentSchemaNested
} from '~/src/server/plugins/engine/components/ComponentBase.js'
import {
  hasComponentField,
  type ComponentFieldClass,
  type FormComponentFieldClass
} from '~/src/server/plugins/engine/components/helpers.js'
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
  items: ComponentFieldClass[]
  formItems: FormComponentFieldClass[]
  formSchema: ComponentSchema
  stateSchema: ComponentSchema

  constructor(componentDefs: ComponentDef[] = [], model: FormModel) {
    const components = componentDefs.map((def) => {
      if (!hasComponentField(def.type)) {
        throw new Error(`Component type ${def.type} doesn't exist`)
      }

      const Comp = Components[def.type]
      return new Comp(def, model)
    })

    const formComponents = components.filter(
      (component): component is FormComponentFieldClass =>
        'isFormComponent' in component && component.isFormComponent
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
    const keys: ComponentSchemaNested = {}

    this.formItems.forEach((item) => {
      Object.assign(keys, item.getFormSchemaKeys())
    })

    return keys
  }

  getStateSchemaKeys() {
    const keys: ComponentSchemaNested = {}

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
