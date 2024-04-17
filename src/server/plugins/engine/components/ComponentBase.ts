import { Schema as JoiSchema } from 'joi'
import {
  ComponentDef,
  ContentComponentsDef,
  InputFieldsComponentsDef
} from '@defra/forms-model'

import { FormModel } from '../models/index.js'
import type { DataType, ViewModel } from './types.js'

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
  formSchema?: JoiSchema
  stateSchema?: JoiSchema

  constructor(def: ComponentDef, model: FormModel) {
    // component definition properties
    this.type = def.type
    this.name = def.name
    this.title = def.title
    this.schema = def.schema || {}
    this.options = def.options
    this.hint = 'hint' in def ? def.hint : undefined
    this.content = 'content' in def ? def.content : undefined
    this.model = model
  }

  /**
   * parses FormData and returns an object provided to a govuk-frontend template to render
   */
  getViewModel(): ViewModel {
    return {
      attributes: {}
    }
  }
}
