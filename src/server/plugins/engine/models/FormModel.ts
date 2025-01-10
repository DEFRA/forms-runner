import {
  ConditionsModel,
  ControllerPath,
  ControllerType,
  formDefinitionSchema,
  hasRepeater,
  type ComponentDef,
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
import {
  type FormContext,
  type FormContextRequest,
  type FormState,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import { FormAction } from '~/src/server/routes/types.js'
import { merge } from '~/src/server/services/cacheService.js'

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
  pageMap: Map<string, Page>
  listMap: Map<string, List>
  componentMap: Map<string, ComponentDef>

  constructor(def: typeof this.def, options: { basePath: string }) {
    const result = formDefinitionSchema.validate(def, { abortEarly: false })

    if (result.error) {
      throw result.error
    }

    // Make a clone of the shallow copy returned
    // by joi so as not to change the source data.
    def = structuredClone(result.value)

    this.def = def
    this.lists = def.lists
    this.sections = def.sections
    this.name = def.name ?? ''
    this.values = result.value
    this.basePath = options.basePath
    this.conditions = {}

    this.pageMap = new Map(def.pages.map((page) => [page.id, page]))
    this.listMap = new Map(def.lists.map((list) => [list.id, list]))
    this.componentMap = new Map(
      def.pages.flatMap((page) =>
        page.components.map((component) => [component.id, component])
      )
    )

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
   * Build the entire model schema from individual pages
   */
  makeSchema(strict = false) {
    let schema = joi.object<FormSubmissionState>().required()

    this.pages.forEach((page) => {
      schema = schema.concat(page.collection.stateSchema)
    })

    return schema
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

  getList(id: string): List | undefined {
    return this.lists.find((list) => list.id === id)
  }

  /**
   * Form context for the current page
   */
  getFormContext(request: FormContextRequest, state: FormState): FormContext {
    const { query } = request

    const { pages } = this
    const page = getPage(this, request)

    // Determine form paths
    // const currentPath = page.path
    // const startPath = page.getStartPath()

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

    for (const page of pages) {
      const { collection, pageDef, condition } = page

      if (condition) {
        const res = condition.validate(state, { allowUnknown: true })
        if (res.error) continue
      }

      // Add page to context
      context.relevantPages.push(page)

      // Skip evaluation state for repeater pages
      if (!hasRepeater(pageDef)) {
        Object.assign(
          context.evaluationState,
          collection.getContextValueFromState(state)
        )
      }

      // Copy relevant state by expected keys
      for (const key of page.keys) {
        if (typeof state[key] !== 'undefined') {
          context.relevantState[key] = state[key]
        }
      }
    }

    return context

    // // Find start page
    // let nextPage = findPage(this, startPath)
    //   // const { collection, pageDef, condition } = page

    //   // if (condition) {
    //   //   const res = condition.validate(state, { allowUnknown: true })
    //   //   if (res.error) continue
    //   // }

    //   // // Add page to context
    //   // context.relevantPages.push(page)

    //   // for (const key of page.keys) {
    //   //   if (typeof state[key] !== 'undefined') {
    //   //     context.relevantState[key] = state[key]
    //   //   }
    //   // }

    //   // Skip evaluation state for repeater pages
    //   // if (!hasRepeater(pageDef)) {
    //   //   Object.assign(
    //   //     context.evaluationState,
    //   //     collection.getContextValueFromState(context.state)
    //   //   )
    //   // }

    //   // Copy relevant state by expected keys
    //   for (const key of nextPage.keys) {
    //     if (typeof context.state[key] !== 'undefined') {
    //       context.relevantState[key] = context.state[key]
    //     }
    //   }

    //   // Stop at current page
    //   if (nextPage.path === currentPath) {
    //     break
    //   }

    //   // Apply conditions to determine next page
    //   nextPage = findPage(this, nextPage.getNextPath(context))
    // }

    // // Validate form state
    // context = validateFormState(request, page, context)

    // // Add paths for navigation
    // for (const { keys, path } of context.relevantPages) {
    //   context.paths.push(path)

    //   // Stop at page with errors
    //   if (
    //     context.errors?.some(({ name, path }) => {
    //       return keys.includes(name) || keys.some((key) => path.includes(key))
    //     })
    //   ) {
    //     break
    //   }
    // }

    // return context
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
