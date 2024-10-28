import { type ComponentDef } from '@defra/forms-model'
import joi, { type ObjectSchema } from 'joi'

import { type ComponentSchemaNested } from '~/src/server/plugins/engine/components/ComponentBase.js'
import {
  getComponentField,
  type ComponentFieldClass,
  type FormComponentFieldClass
} from '~/src/server/plugins/engine/components/helpers.js'
import { type ComponentCollectionViewModel } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormState,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class ComponentCollection {
  items: ComponentFieldClass[]
  formItems: FormComponentFieldClass[]
  formSchema: ObjectSchema<FormPayload>
  stateSchema: ObjectSchema<FormSubmissionState>

  constructor(componentDefs: ComponentDef[] = [], model: FormModel) {
    const components = componentDefs.map((def) => {
      const Component = getComponentField(def)

      if (!Component) {
        throw new Error(`Component type ${def.type} doesn't exist`)
      }

      return new Component(def, model)
    })

    const formComponents = components.filter(
      (component): component is FormComponentFieldClass =>
        component.isFormComponent
    )

    this.items = components
    this.formItems = formComponents
    this.formSchema = joi
      .object<FormPayload>()
      .keys(this.getFormSchemaKeys())
      .required()
      .keys({ crumb: joi.string().optional().allow('') })

    this.stateSchema = joi
      .object<FormSubmissionState>()
      .keys(this.getStateSchemaKeys())
      .required()
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

  getFormDataFromState(state: FormSubmissionState) {
    const payload: FormPayload = {}

    this.formItems.forEach((item) => {
      Object.assign(payload, item.getFormDataFromState(state))
    })

    return payload
  }

  getFormValueFromState(state: FormSubmissionState) {
    const payload: FormPayload = {}

    // Remove name prefix for formatted value
    for (const [name, value] of Object.entries(
      this.getFormDataFromState(state)
    )) {
      const key = name.split('__').pop()
      if (!key) {
        continue
      }

      payload[key] = value
    }

    return payload
  }

  getStateFromValidForm(payload: FormPayload) {
    const state: FormState = {}

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
        type: item.type,
        isFormComponent: item.isFormComponent,
        model: item.getViewModel(payload, errors)
      }
    })

    if (conditions) {
      return result.filter((item) =>
        item.model.condition
          ? conditions[item.model.condition]?.fn(payload)
          : true
      )
    }

    return result
  }
}
