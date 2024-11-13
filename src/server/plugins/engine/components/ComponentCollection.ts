import { type ComponentDef } from '@defra/forms-model'
import joi, {
  type CustomValidator,
  type ErrorReportCollection,
  type LanguageMessages,
  type ObjectSchema
} from 'joi'

import {
  isFormState,
  isFormValue
} from '~/src/server/plugins/engine/components/FormComponent.js'
import {
  createComponentField,
  type ComponentFieldClass,
  type FormComponentFieldClass
} from '~/src/server/plugins/engine/components/helpers.js'
import { type ComponentViewModel } from '~/src/server/plugins/engine/components/types.js'
import { getErrors } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type FormPayload,
  type FormState,
  type FormSubmissionError,
  type FormSubmissionState,
  type FormValidationResult
} from '~/src/server/plugins/engine/types.js'

export class ComponentCollection {
  page?: PageControllerClass
  parent?: ComponentFieldClass

  items: ComponentFieldClass[]
  formItems: FormComponentFieldClass[]
  formSchema: ObjectSchema<FormPayload>
  stateSchema: ObjectSchema<FormSubmissionState>

  constructor(
    componentDefs: ComponentDef[],
    options: {
      page?: PageControllerClass
      parent?: ComponentFieldClass
      model: FormModel
    },
    schema?: {
      /**
       * Defines an all-or-nothing relationship between keys where if one
       * of the peers is present, all of them are required as well
       */
      peers?: string[]

      /**
       * Defines a custom validation rule for the object schema
       */
      custom?: CustomValidator

      /**
       * Defines custom validation messages for the object schema
       */
      messages?: LanguageMessages
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

    if (schema?.messages) {
      formSchema = formSchema.messages(schema.messages)
    }

    // Add parent field title to collection field errors
    formSchema = formSchema.error((errors) => {
      return errors.flatMap((error) => {
        if (!isErrorContext(error.local) || error.local.title) {
          return error
        }

        // Use field key or first missing child field
        let { missing, key = missing?.[0] } = error.local

        // But avoid numeric key used by array payloads
        if (typeof key === 'number') {
          key = error.path[0]
        }

        // Find the parent field
        const parent = formItems.find(
          (item) => item.name === key?.split('__').shift()
        )

        // Find the child field
        const child = (parent?.children?.formItems ?? formItems).find(
          (item) => item.name === key
        )

        // Update error with child label
        if (child && (!error.local.label || error.local.label === 'value')) {
          error.local.label = child.title.toLowerCase()
        }

        // Fix error summary links for missing fields
        if (missing?.length) {
          error.path = missing
          error.local.key = missing[0]
        }

        // Update error with parent title
        error.local.title ??= parent?.title

        return error
      })
    })

    if (schema?.peers) {
      formSchema = formSchema.and(...schema.peers, {
        isPresent: isFormValue
      })
    }

    if (schema?.custom) {
      formSchema = formSchema.custom(schema.custom)
    }

    this.page = options.page
    this.parent = options.parent

    this.items = items
    this.formItems = formItems
    this.formSchema = formSchema
    this.stateSchema = stateSchema
  }

  get keys() {
    return this.formItems.map(({ name }) => name)
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

  getErrors(errors?: FormSubmissionError[]): FormSubmissionError[] | undefined {
    const { formItems } = this

    const list: FormSubmissionError[] = []

    // Add only one error per field
    for (const field of formItems) {
      const error = field.getError(errors)

      if (error) {
        list.push(error)
      }
    }

    if (!list.length) {
      return
    }

    return list
  }

  getViewModel(
    payload: FormPayload,
    errors?: FormSubmissionError[],
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

  /**
   * Validate form state only
   * @param value - answers via POST payload
   * @param value - answers via Redis state
   */
  validate(payload?: FormPayload): FormValidationResult<FormPayload>

  /**
   * Validate form payload only
   * @param value - answers via Redis state
   * @param schema - field name for state schema
   */
  validate(
    state: FormSubmissionState,
    schema: 'stateSchema'
  ): FormValidationResult<FormSubmissionState>

  validate(
    value: FormPayload | FormSubmissionState = {},
    schema: 'formSchema' | 'stateSchema' = 'formSchema'
  ): FormValidationResult<typeof value> {
    const result = this[schema].validate(value, opts)
    const details = result.error?.details

    return {
      value: (result.value ?? {}) as typeof value,
      errors: this.page?.getErrors(details) ?? getErrors(details)
    }
  }
}

/**
 * Check for field local state
 */
export function isErrorContext(
  value?: unknown
): value is ErrorReportCollection['local'] {
  return isFormState(value) && typeof value.label === 'string'
}
