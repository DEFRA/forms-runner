import {
  ConditionsModel,
  formDefinitionSchema,
  type ConditionWrapper,
  type ConditionsModelData,
  type DateUnits,
  type FormDefinition,
  type List,
  type Page
} from '@defra/forms-model'
import { add } from 'date-fns'
import { Parser } from 'expr-eval'
import joi from 'joi'

import { type ExecutableCondition } from '~/src/server/plugins/engine/models/types.js'
import { PageControllerBase } from '~/src/server/plugins/engine/pageControllers/PageControllerBase.js'
import {
  getPageController,
  type PageControllerClass,
  type PageControllerType
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/index.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'

class EvaluationContext {
  constructor(
    conditions: Partial<Record<string, ExecutableCondition>>,
    value: FormSubmissionState
  ) {
    Object.assign(this, value)

    for (const key in conditions) {
      Object.defineProperty(this, key, {
        get() {
          return conditions[key]?.fn(value)
        }
      })
    }
  }
}

export class FormModel {
  /**
   * Responsible for instantiating the {@link PageControllerBase} and {@link EvaluationContext} from a form JSON
   */

  /** the entire form JSON as an object */
  def: FormDefinition

  lists: FormDefinition['lists']
  sections: FormDefinition['sections'] = []
  options: { basePath: string; defaultPageController?: string; formId?: string }
  name: string
  values: FormDefinition
  DefaultPageController: PageControllerType | undefined = PageController

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

    if (options.defaultPageController) {
      this.DefaultPageController = getPageController(
        options.defaultPageController
      )
    }

    this.basePath = options.basePath

    this.conditions = {}
    def.conditions.forEach((conditionDef) => {
      const condition = this.makeCondition(conditionDef)
      this.conditions[condition.name] = condition
    })

    this.pages = def.pages.map((pageDef) => this.makePage(pageDef))

    // All models get an Application Status page
    this.pages.push(
      this.makePage({
        path: '/status',
        title: 'Form submitted',
        components: [],
        next: [],
        controller: 'StatusPageController'
      })
    )

    this.startPage = this.pages.find((page) => page.path === def.startPage)
  }

  /**
   * build the entire model schema from individual pages/sections
   */
  makeSchema(state: FormSubmissionState) {
    return this.makeFilteredSchema(state, this.pages)
  }

  /**
   * build the entire model schema from individual pages/sections and filter out answers
   * for pages which are no longer accessible due to an answer that has been changed
   */
  makeFilteredSchema(
    _state: FormSubmissionState,
    relevantPages: PageControllerClass[]
  ) {
    // Build the entire model schema
    // from the individual pages/sections
    let schema = joi.object().required()

    ;[undefined, ...this.sections].forEach((section) => {
      const sectionPages = relevantPages.filter(
        (page) => page.section === section
      )

      if (sectionPages.length) {
        if (section) {
          let sectionSchema = joi.object().required()

          sectionPages.forEach((sectionPage) => {
            sectionSchema = sectionSchema.concat(sectionPage.stateSchema)
          })

          schema = schema.append({
            [section.name]: sectionSchema
          })
        } else {
          sectionPages.forEach((sectionPage) => {
            schema = schema.concat(sectionPage.stateSchema)
          })
        }
      }
    })

    return schema
  }

  /**
   * instantiates a Page based on {@link Page}
   */
  makePage(pageDef: Page): PageControllerClass {
    if (pageDef.controller) {
      const PageController = getPageController(pageDef.controller)

      if (!PageController) {
        throw new Error(`PageController for ${pageDef.controller} not found`)
      }

      return new PageController(this, pageDef)
    }

    if (this.DefaultPageController) {
      const DefaultPageController = this.DefaultPageController
      return new DefaultPageController(this, pageDef)
    }

    return new PageControllerBase(this, pageDef)
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

    parser.functions.dateForComparison = function (
      timePeriod: number,
      timeUnit: DateUnits
    ) {
      return add(new Date(), { [timeUnit]: timePeriod }).toISOString()
    }

    const { name, displayName, value } = condition
    const expr = this.toConditionExpression(value, parser)

    const fn = (value: FormSubmissionState) => {
      const ctx = new EvaluationContext(this.conditions, value)
      try {
        return expr.evaluate(ctx)
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
}
