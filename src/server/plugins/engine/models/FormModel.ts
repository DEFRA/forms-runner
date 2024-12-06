import {
  ConditionsModel,
  ControllerPath,
  ControllerType,
  formDefinitionSchema,
  hasRepeater,
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

import {
  checkFormStatus,
  findPage,
  getError,
  getPage
} from '~/src/server/plugins/engine/helpers.js'
import { type ExecutableCondition } from '~/src/server/plugins/engine/models/types.js'
import {
  getPageController,
  type PageControllerClass
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type FormContext,
  type FormContextProgress,
  type FormContextRequest,
  type FormState,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class FormModel {
  /**
   * Responsible for instantiating the {@link PageControllerClass} and condition context from a form JSON
   */

  /** the entire form JSON as an object */
  def: FormDefinition

  lists: FormDefinition['lists']
  sections: FormDefinition['sections'] = []
  name: string
  values: FormDefinition
  basePath: string
  conditions: Partial<Record<string, ExecutableCondition>>
  pages: PageControllerClass[]

  constructor(def: typeof this.def, options: { basePath: string }) {
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
  }

  /**
   * build the entire model schema from individual pages/sections
   */
  makeSchema() {
    return this.makeFilteredSchema(this.pages)
  }

  /**
   * build the entire model schema from individual pages/sections and filter out answers
   * for pages which are no longer accessible due to an answer that has been changed
   */
  makeFilteredSchema(relevantPages: PageControllerClass[]) {
    // Build the entire model schema
    // from the individual pages/sections
    let schema = joi.object<FormSubmissionState>().required()

    relevantPages.forEach((page) => {
      schema = schema.concat(page.collection.stateSchema)
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

    const fn = (evaluationState: FormState) => {
      const ctx = this.toConditionContext(evaluationState, this.conditions)
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
    evaluationState: FormState,
    conditions: Partial<Record<string, ExecutableCondition>>
  ) {
    const context = { ...evaluationState }

    for (const key in conditions) {
      Object.defineProperty(context, key, {
        get() {
          return conditions[key]?.fn(evaluationState)
        }
      })
    }

    return context as Extract<Value, Record<string, Value>>
  }

  toConditionExpression(value: ConditionsModelData, parser: Parser) {
    const conditions = ConditionsModel.from(value)
    return parser.parse(conditions.toExpression())
  }

  getList(name: string): List | undefined {
    return this.lists.find((list) => list.name === name)
  }

  /**
   * Form context for the current page
   * (with progress validation)
   */
  getFormContext(
    request: FormContextRequest,
    state: FormState
  ): FormContextProgress

  /**
   * Form context for the current page
   * (without progress validation)
   */
  getFormContext(
    request: FormContextRequest,
    state: FormState,
    options: { validate: false }
  ): FormContext

  getFormContext(
    request: FormContextRequest,
    state: FormState,
    options?: { validate: false }
  ): FormContext | FormContextProgress {
    const page = getPage(this, request)

    // Determine form paths
    const currentPath = page.path
    const startPath = page.getStartPath()

    const context: FormContext = {
      evaluationState: {},
      relevantState: {},
      relevantPages: [],
      state
    }

    // Find start page
    let nextPage = findPage(this, startPath)

    // Walk form pages from start
    while (nextPage) {
      const { collection, pageDef } = nextPage

      // Add page to context
      context.relevantPages.push(nextPage)

      // Skip evaluation state for repeater pages
      if (!hasRepeater(pageDef)) {
        Object.assign(
          context.evaluationState,
          collection.getContextValueFromState(state)
        )
      }

      // Copy relevant state by expected keys
      for (const key of nextPage.keys) {
        if (typeof state[key] !== 'undefined') {
          context.relevantState[key] = state[key]
        }
      }

      // Stop at current page
      if (nextPage.path === currentPath) {
        break
      }

      // Apply conditions to determine next page
      nextPage = findPage(this, nextPage.getNextPath(context))
    }

    // Skip validation (optional)
    if (options?.validate === false) {
      return context
    }

    // Validate relevant state
    const { error } = page.model
      .makeFilteredSchema(context.relevantPages)
      .validate(context.relevantState, { ...opts, stripUnknown: true })

    // Format relevant state errors
    const errors = error?.details.map(getError)
    const paths: string[] = []
    const { isPreview } = checkFormStatus(request.path)

    // Add paths for navigation
    for (const { collection, path } of context.relevantPages) {
      paths.push(path)

      // Stop at current page or with errors
      if (
        !isPreview &&
        (path === currentPath || collection.getErrors(errors))
      ) {
        break
      }
    }

    return {
      ...context,
      errors,
      paths
    }
  }
}
