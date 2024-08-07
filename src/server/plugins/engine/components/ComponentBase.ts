import { type ComponentDef } from '@defra/forms-model'
import joi, {
  type ArraySchema,
  type BooleanSchema,
  type DateSchema,
  type NumberSchema,
  type ObjectSchema,
  type StringSchema
} from 'joi'

import {
  type DataType,
  type ViewModel
} from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { answerFromDetailItem } from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
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

  isFormComponent = false

  /**
   * This is passed onto webhooks, see {@link answerFromDetailItem}
   */
  dataType: DataType = 'text'
  model: FormModel

  /** joi schemas based on a component defined in the form JSON. This validates a user's answer and is generated from {@link ComponentDef} */
  formSchema: ComponentSchema = joi.string()
  stateSchema: ComponentSchema = joi.string()

  constructor(def: ComponentDef, model: FormModel) {
    this.type = def.type
    this.name = def.name
    this.title = def.title
    this.schema = def.schema
    this.options = def.options

    this.model = model
  }

  /**
   * parses form payload and returns an object provided to a govuk-frontend template to render
   */
  getViewModel<FormPayloadType extends FormPayload>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    payload: FormPayloadType,

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    errors?: FormSubmissionErrors
  ): ViewModel {
    return {
      attributes: {}
    }
  }
}

export type ComponentSchema =
  | ArraySchema<string>
  | ArraySchema<number>
  | ArraySchema<boolean>
  | BooleanSchema<string>
  | DateSchema
  | NumberSchema<string>
  | NumberSchema
  | ObjectSchema
  | StringSchema

export type ComponentSchemaNested = Record<string, ComponentSchema | undefined>

export type ComponentSchemaKeys = Record<
  string,
  ComponentSchema | ComponentSchemaNested | undefined
>
