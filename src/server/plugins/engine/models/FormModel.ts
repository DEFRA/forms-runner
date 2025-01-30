import {
  ConditionsModel,
  ControllerPath,
  ControllerType,
  Engine,
  formDefinitionSchema,
  hasRepeater,
  type ConditionWrapper,
  type ConditionsModelData,
  type DateUnits,
  type FormDefinition,
  type List
} from '@defra/forms-model'
import { add } from 'date-fns'
import { Parser, type Value } from 'expr-eval'
import joi from 'joi'

import {
  findPage,
  getError,
  getPage
} from '~/src/server/plugins/engine/helpers.js'
import { type ExecutableCondition } from '~/src/server/plugins/engine/models/types.js'
import {
  createPage,
  type PageControllerClass
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import * as defaultServices from '~/src/server/plugins/engine/services/index.js'
import {
  type FormContext,
  type FormContextRequest,
  type FormState,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import { FormAction } from '~/src/server/routes/types.js'
import { merge } from '~/src/server/services/cacheService.js'
import { type Services } from '~/src/server/types.js'

export class FormModel {
  /** The runtime engine that should be used */
  engine?: Engine

  /** the entire form JSON as an object */
  def: FormDefinition

  lists: FormDefinition['lists']
  sections: FormDefinition['sections'] = []
  name: string
  values: FormDefinition
  basePath: string
  conditions: Partial<Record<string, ExecutableCondition>>
  pages: PageControllerClass[]
  services: Services
  output: {
    audience: 'human' | 'machine'
    version: string
  }

  constructor(
    def: typeof this.def,
    options: { basePath: string },
    services: Services = defaultServices
  ) {
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

    this.engine = def.engine
    this.def = def
    this.lists = def.lists
    this.sections = def.sections
    this.name = def.name ?? ''
    this.values = result.value
    this.basePath = options.basePath
    this.conditions = {}
    this.services = services
    this.output = {
      // TODO do this conditionally
      audience: 'human',
      version: '1'
    }

    def.conditions.forEach((conditionDef) => {
      const condition = this.makeCondition(conditionDef)
      this.conditions[condition.name] = condition
    })

    this.pages = def.pages.map((pageDef) => createPage(this, pageDef))

    if (
      !def.pages.some(
        ({ controller }) =>
          // Check for user-provided status page (optional)
          controller === ControllerType.Status
      )
    ) {
      this.pages.push(
        createPage(this, {
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
   */
  getFormContext(request: FormContextRequest, state: FormState): FormContext {
    const { query } = request

    const page = getPage(this, request)

    // Determine form paths
    const currentPath = page.path
    const startPath = page.getStartPath()

    // Preview URL direct access is allowed
    const isForceAccess = 'force' in query

    let context: FormContext = {
      evaluationState: {},
      relevantState: {},
      relevantPages: [],
      payload: page.getFormDataFromState(request, state),
      state,
      paths: [],
      isForceAccess
    }

    // Validate current page
    context = validateFormPayload(request, page, context)

    // Find start page
    let nextPage = findPage(this, startPath)

    this.initialiseContext(context)

    // Walk form pages from start
    while (nextPage) {
      // Add page to context
      context.relevantPages.push(nextPage)

      this.assignEvaluationState(context, nextPage)

      this.assignRelevantState(context, nextPage)

      // Stop at current page
      if (nextPage.path === currentPath) {
        break
      }

      // Apply conditions to determine next page
      nextPage = findPage(this, nextPage.getNextPath(context))
    }

    // Validate form state
    context = validateFormState(request, page, context)

    // Add paths for navigation
    this.assignPaths(context)

    return context
  }

  private initialiseContext(context: FormContext) {
    // For the V2 engine, we need to initialise `evaluationState` to null
    // for all keys. This is because the current condition evaluation
    // library (eval-expr) will throw if an expression uses a key that is undefined.
    if (this.engine === Engine.V2) {
      for (const page of this.pages) {
        for (const key of page.keys) {
          context.evaluationState[key] = null
        }
      }
    }
  }

  private assignEvaluationState(
    context: FormContext,
    page: PageControllerClass
  ) {
    const { collection, pageDef } = page
    // Skip evaluation state for repeater pages

    if (!hasRepeater(pageDef)) {
      Object.assign(
        context.evaluationState,
        collection.getContextValueFromState(context.state)
      )
    }
  }

  private assignRelevantState(context: FormContext, page: PageControllerClass) {
    // Copy relevant state by expected keys
    for (const key of page.keys) {
      if (typeof context.state[key] !== 'undefined') {
        context.relevantState[key] = context.state[key]
      }
    }
  }

  private assignPaths(context: FormContext) {
    for (const { keys, path } of context.relevantPages) {
      context.paths.push(path)

      // Stop at page with errors
      if (
        context.errors?.some(({ name, path }) => {
          return keys.includes(name) || keys.some((key) => path.includes(key))
        })
      ) {
        break
      }
    }
  }
}

/**
 * Validate current page only
 */
function validateFormPayload(
  request: FormContextRequest,
  page: PageControllerClass,
  context: FormContext
): FormContext {
  const { collection } = page
  const { payload, state } = context

  const { action } = page.getFormParams(request)

  // Skip validation GET requests or other actions
  if (!request.payload || action !== FormAction.Validate) {
    return context
  }

  // Validate form data into payload
  const { value, errors } = collection.validate({
    ...payload,
    ...request.payload
  })

  // Add sanitised payload (ready to save)
  const formState = page.getStateFromValidForm(request, state, value)

  return {
    ...context,
    payload: merge(payload, value),
    state: merge(state, formState),
    errors
  }
}

/**
 * Validate entire form state
 */
function validateFormState(
  request: FormContextRequest,
  page: PageControllerClass,
  context: FormContext
): FormContext {
  const { errors = [], relevantPages, relevantState } = context

  // Exclude current page
  const previousPages = relevantPages.filter(
    (relevantPage) => relevantPage !== page
  )

  // Validate relevant state
  const { error } = page.model
    .makeFilteredSchema(previousPages)
    .validate(relevantState, { ...opts, stripUnknown: true })

  // Add relevant state errors
  if (error) {
    const errorsState = error.details.map(getError)
    return { ...context, errors: errors.concat(errorsState) }
  }

  return context
}
