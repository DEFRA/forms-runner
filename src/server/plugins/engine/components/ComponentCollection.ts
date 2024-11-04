import { type ComponentDef } from '@defra/forms-model'
import joi, { type CustomValidator, type ObjectSchema } from 'joi'

import {
  createComponentField,
  type ComponentFieldClass,
  type FormComponentFieldClass
} from '~/src/server/plugins/engine/components/helpers.js'
import { type ComponentViewModel } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormState,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class ComponentCollection {
  parent?: ComponentFieldClass

  items: ComponentFieldClass[]
  formItems: FormComponentFieldClass[]
  formSchema: ObjectSchema<FormPayload>
  stateSchema: ObjectSchema<FormSubmissionState>

  constructor(
    componentDefs: ComponentDef[],
    options: {
      parent?: ComponentFieldClass
      model: FormModel
    },
    schema?: {
      custom?: CustomValidator
    }
  ) {
    const items = componentDefs.map((def) => {
      const component = createComponentField(def, options.model)

      if (!component) {
        throw new Error(`Component type ${def.type} doesn't exist`)
      }

      return component
    })

    const formItems = items.filter(
      (item): item is FormComponentFieldClass => item.isFormComponent
    )

    let formSchema = joi.object<FormPayload>().required()
    let stateSchema = joi.object<FormSubmissionState>().required()

    // Add each field or concat collection
    for (const field of formItems) {
      const { children, name } = field

      formSchema = children
        ? formSchema.concat(children.formSchema)
        : formSchema.keys({ [name]: field.formSchema })

      stateSchema = children
        ? stateSchema.concat(children.stateSchema)
        : stateSchema.keys({ [name]: field.stateSchema })
    }

    if (schema?.custom) {
      formSchema = formSchema.custom(schema.custom)
    }

    this.parent = options.parent

    this.items = items
    this.formItems = formItems
    this.formSchema = formSchema
    this.stateSchema = stateSchema
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
  ) {
    const { items } = this

    const result: ComponentViewModel[] = items.map((item) => {
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
