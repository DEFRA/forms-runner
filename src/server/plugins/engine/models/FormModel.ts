import {
  ConditionsModel,
  ControllerPath,
  ControllerType,
  formDefinitionSchema,
  type ConditionWrapper,
  type ConditionsModelData,
  type DateUnits,
  type FormDefinition,
  type List,
  type Page
} from '@defra/forms-model'
import { add } from 'date-fns'
import { Parser, type Value } from 'expr-eval'
import joi from 'joi'

import { type ExecutableCondition } from '~/src/server/plugins/engine/models/types.js'
import {
  getPageController,
  type PageControllerClass
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'

export class FormModel {
  /**
   * Responsible for instantiating the {@link PageControllerClass} and condition context from a form JSON
   */

  /** the entire form JSON as an object */
  def: FormDefinition

  lists: FormDefinition['lists']
  sections: FormDefinition['sections'] = []
  options: { basePath: string }
  name: string
  values: FormDefinition
  basePath: string
  conditions: Partial<Record<string, ExecutableCondition>>
  pages: PageControllerClass[]
  startPage?: PageControllerClass

  constructor(def: typeof this.def, options: typeof this.options) {
    const result = formDefinitionSchema.validate(def, { abortEarly: false })

    if (result.error) {
      throw result.error
    }

    // Make a clone of the shallow copy returned
    // by joi so as not to change the source data.
    def = structuredClone(result.value)

    // Add default lists
    def.lists.push({
      name: '__yesNo',
      title: 'Yes/No',
      type: 'boolean',
      items: [
        {
          text: 'Yes',
          value: true
        },
        {
          text: 'No',
          value: false
        }
      ]
    })

    this.def = def
    this.lists = def.lists
    this.sections = def.sections
    this.options = options
    this.name = def.name ?? ''
    this.values = result.value
    this.basePath = options.basePath
    this.conditions = {}

    def.conditions.forEach((conditionDef) => {
      const condition = this.makeCondition(conditionDef)
      this.conditions[condition.name] = condition
    })

    this.pages = def.pages.map((pageDef) => this.makePage(pageDef))

    if (
      !def.pages.some(
        ({ controller }) =>
          // Check for user-provided status page (optional)
          controller === ControllerType.Status
      )
    ) {
      this.pages.push(
        this.makePage({
          title: 'Form submitted',
          path: ControllerPath.Status,
          controller: ControllerType.Status
        })
      )
    }

    this.startPage = this.pages.find((page) => page.path === def.startPage)
  }

  /**
   * build the entire model schema from individual pages/sections
   */
  makeSchema() {
    // Build the entire model schema
    // from the individual pages/sections
    let schema = joi.object<FormSubmissionState>().required()

    this.pages.forEach((page) => {
      schema = schema.concat(page.stateSchema)
    })

    return schema
  }

  /**
   * build the entire model schema from individual pages/sections and filter out answers
   * for pages which are no longer accessible due to an answer that has been changed
   */
  makeFilteredSchema(state: FormSubmissionState) {
    // Build the entire model schema
    // from the individual pages/sections
    let schema = joi.object<FormSubmissionState>().required()

    this.getRelevantPages(state).forEach((page) => {
      schema = schema.concat(page.stateSchema)
    })

    return schema
  }

  /**
   * instantiates a Page based on {@link Page}
   */
  makePage(pageDef: Page): PageControllerClass {
    const PageController = getPageController(pageDef.controller)
    return new PageController(this, pageDef)
  }

  /**
   * Instantiates a Condition based on {@link ConditionWrapper}
   * @param condition
   */
  makeCondition(condition: ConditionWrapper): ExecutableCondition {
    const parser = new Parser({
      operators: {
        logical: true
      }
    })

    Object.assign(parser.functions, {
      dateForComparison(timePeriod: number, timeUnit: DateUnits) {
        return add(new Date(), { [timeUnit]: timePeriod }).toISOString()
      }
    })

    const { name, displayName, value } = condition
    const expr = this.toConditionExpression(value, parser)

    const fn = (value: FormSubmissionState) => {
      const ctx = this.toConditionContext(value, this.conditions)
      try {
        return expr.evaluate(ctx) as boolean
      } catch {
        return false
      }
    }

    return {
      name,
      displayName,
      value,
      expr,
      fn
    }
  }

  toConditionContext(
    value: FormSubmissionState,
    conditions: Partial<Record<string, ExecutableCondition>>
  ) {
    const context = { ...value }

    for (const key in conditions) {
      Object.defineProperty(context, key, {
        get() {
          return conditions[key]?.fn(value)
        }
      })
    }

    return context as Extract<Value, Record<string, Value>>
  }

  toConditionExpression(value: ConditionsModelData, parser: Parser) {
    const conditions = ConditionsModel.from(value)
    return parser.parse(conditions.toExpression())
  }

  get conditionOptions() {
    return { allowUnknown: true, presence: 'required' }
  }

  getList(name: string): List | undefined {
    return this.lists.find((list) => list.name === name)
  }

  public getRelevantPages(state: FormSubmissionState) {
    let nextPage = this.startPage

    const relevantPages: PageControllerClass[] = []

    while (nextPage != null) {
      if (nextPage.hasFormComponents) {
        relevantPages.push(nextPage)
      }

      nextPage = nextPage.getNextPage(state)
    }

    return relevantPages
  }
}
