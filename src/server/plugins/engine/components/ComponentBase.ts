import {
  type ComponentDef,
  type ContentComponentsDef,
  type InputFieldsComponentsDef
} from '@defra/forms-model'
import joi, {
  type AlternativesSchema,
  type ArraySchema,
  type BooleanSchema,
  type NumberSchema,
  type ObjectSchema,
  type StringSchema
} from 'joi'

import {
  type DataType,
  type ViewModel
} from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class ComponentBase {
  type: ComponentDef['type']
  name: ComponentDef['name']
  title: ComponentDef['title']
  schema: ComponentDef['schema']
  options: ComponentDef['options']
  hint?: InputFieldsComponentsDef['hint']
  content?: ContentComponentsDef['content']

  /**
   * This is passed onto webhooks, see {@link answerFromDetailItem}
   */
  dataType?: DataType = 'text'
  model: FormModel

  /** joi schemas based on a component defined in the form JSON. This validates a user's answer and is generated from {@link ComponentDef} */
  formSchema: ComponentSchema = joi.string()
  stateSchema: ComponentSchema = joi.string()

  constructor(def: ComponentDef, model: FormModel) {
    // component definition properties
    this.type = def.type
    this.name = def.name
    this.title = def.title
    this.schema = def.schema
    this.options = def.options
    this.hint = 'hint' in def ? def.hint : undefined
    this.content = 'content' in def ? def.content : undefined
    this.model = model
  }

  /**
   * parses form payload and returns an object provided to a govuk-frontend template to render
   */
  getViewModel(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    payload: FormPayload,

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    errors?: FormSubmissionErrors
  ): ViewModel {
    return {
      attributes: {}
    }
  }
}

export type ComponentSchema =
  | AlternativesSchema<string | number>
  | ArraySchema<string>
  | ArraySchema<number>
  | ArraySchema<boolean>
  | BooleanSchema<string>
  | NumberSchema<string>
  | NumberSchema
  | ObjectSchema
  | StringSchema

export type ComponentSchemaNested = Record<string, ComponentSchema | undefined>

export type ComponentSchemaKeys = Record<
  string,
  ComponentSchema | ComponentSchemaNested | undefined
>
