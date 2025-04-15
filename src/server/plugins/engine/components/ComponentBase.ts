import { isConditionalType, type ComponentDef } from '@defra/forms-model'
import joi, {
  type ArraySchema,
  type BooleanSchema,
  type DateSchema,
  type NumberSchema,
  type ObjectSchema,
  type StringSchema
} from 'joi'

import { type ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type Component } from '~/src/server/plugins/engine/components/helpers.js'
import { type ViewModel } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'

export class ComponentBase {
  page?: PageControllerClass
  parent: Component | undefined
  collection: ComponentCollection | undefined

  type: ComponentDef['type']
  name: ComponentDef['name']
  title: ComponentDef['title']
  schema?: Extract<ComponentDef, { schema: object }>['schema']
  options?: Extract<ComponentDef, { options: object }>['options']

  isFormComponent = false
  model: FormModel

  /** joi schemas based on a component defined in the form JSON. This validates a user's answer and is generated from {@link ComponentDef} */
  formSchema: ComponentSchema = joi.string()
  stateSchema: ComponentSchema = joi.string()

  constructor(
    def: ComponentDef,
    props: {
      page?: PageControllerClass
      parent?: Component
      model: FormModel
    }
  ) {
    this.type = def.type
    this.name = def.name
    this.title = def.title

    if ('schema' in def) {
      this.schema = def.schema
    }

    if ('options' in def) {
      this.options = def.options
    }

    this.page = props.page
    this.parent = props.parent
    this.model = props.model
  }

  get viewModel() {
    const { options, type } = this

    const viewModel: ViewModel = {
      attributes: {}
    }

    if (!options) {
      return viewModel
    }

    if ('autocomplete' in options) {
      viewModel.attributes.autocomplete = options.autocomplete
    }

    if ('classes' in options) {
      viewModel.classes = options.classes
    }

    if ('condition' in options && isConditionalType(type)) {
      viewModel.condition = options.condition
    }

    return viewModel
  }
}

export type ComponentSchema =
  | ArraySchema<string>
  | ArraySchema<number>
  | ArraySchema<boolean>
  | ArraySchema<object>
  | BooleanSchema<string>
  | DateSchema
  | NumberSchema<string>
  | NumberSchema
  | ObjectSchema
  | StringSchema
