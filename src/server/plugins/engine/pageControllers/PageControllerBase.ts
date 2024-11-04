import {
  ComponentType,
  hasComponents,
  hasNext,
  hasRepeater,
  type FormDefinition,
  type Link,
  type Page,
  type Section
} from '@defra/forms-model'
import { type Boom } from '@hapi/boom'
import {
  type ResponseObject,
  type ResponseToolkit,
  type RouteOptions,
  type ServerRoute
} from '@hapi/hapi'
import { merge } from '@hapi/hoek'
import { format, parseISO } from 'date-fns'
import {
  type ObjectSchema,
  type Schema,
  type ValidationErrorItem,
  type ValidationResult
} from 'joi'

import { config } from '~/src/config/index.js'
import { CheckboxesField } from '~/src/server/plugins/engine/components/CheckboxesField.js'
import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { DatePartsField } from '~/src/server/plugins/engine/components/DatePartsField.js'
import { RadiosField } from '~/src/server/plugins/engine/components/RadiosField.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import {
  encodeUrl,
  proceed,
  redirectTo
} from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { validationOptions } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import {
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionErrors,
  type FormSubmissionState,
  type FormValidationResult,
  type PageViewModel
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'
import { type CacheService } from '~/src/server/services/index.js'

const FORM_SCHEMA = Symbol('FORM_SCHEMA')
const STATE_SCHEMA = Symbol('STATE_SCHEMA')

const designerUrl = config.get('designerUrl')

export class PageControllerBase {
  declare [FORM_SCHEMA]: ObjectSchema<FormPayload>;
  declare [STATE_SCHEMA]: ObjectSchema<FormSubmissionState>

  /**
   * The base class for all page controllers. Page controllers are responsible for generating the get and post route handlers when a user navigates to `/{id}/{path*}`.
   */
  def: FormDefinition
  name?: string
  model: FormModel
  pageDef: Page
  path: string
  title: string
  condition?: string
  section?: Section
  components: ComponentCollection
  hasFormComponents: boolean
  errorSummaryTitle = 'There is a problem'
  viewName = 'index'

  constructor(model: FormModel, pageDef: Page) {
    const { def } = model

    this.def = def
    this.name = def.name
    this.model = model
    this.pageDef = pageDef
    this.path = pageDef.path
    this.title = pageDef.title

    // Resolve section
    this.section = model.sections.find(
      (section) => section.name === pageDef.section
    )

    // Components collection
    const components = hasComponents(pageDef) ? pageDef.components : []

    this.components = new ComponentCollection(components, model)
    this.hasFormComponents = !!this.components.formItems.length

    this[FORM_SCHEMA] = this.components.formSchema
    this[STATE_SCHEMA] = this.components.stateSchema
  }

  /**
   * Used for mapping form payloads and errors to govuk-frontend's template api, so a page can be rendered
   * @param request - the hapi request
   * @param payload - contains a user's form payload
   * @param [errors] - validation errors that may have occurred
   */
  getViewModel(
    request: FormRequest | FormRequestPayload,
    payload: FormPayload,
    errors?: FormSubmissionErrors
  ): PageViewModel {
    let showTitle = true

    let { title: pageTitle, section } = this
    const sectionTitle = section?.hideTitle !== true ? section?.title : ''

    const serviceUrl = `/${this.model.basePath}`

    const components = this.components.getViewModel(payload, errors)
    const formComponents = components.filter(
      ({ isFormComponent }) => isFormComponent
    )

    // Single form component? Hide title and customise label or legend instead
    if (formComponents.length === 1) {
      const { model } = formComponents[0]
      const { fieldset, label } = model

      // Set as page heading when not following other content
      const isPageHeading = formComponents[0] === components[0]

      // Check for legend or label
      const labelOrLegend = fieldset?.legend ?? label

      // Use legend or label as page heading
      if (labelOrLegend) {
        const size = isPageHeading ? 'l' : 'm'

        labelOrLegend.classes =
          labelOrLegend === label
            ? `govuk-label--${size}`
            : `govuk-fieldset__legend--${size}`

        if (isPageHeading) {
          labelOrLegend.isPageHeading = isPageHeading

          // Check for optional in label
          const isOptional =
            this.components.formItems.at(0)?.options.required === false

          if (pageTitle) {
            labelOrLegend.text = isOptional
              ? `${pageTitle}${optionalText}`
              : pageTitle
          }

          pageTitle = pageTitle || labelOrLegend.text
        }
      }

      showTitle = !isPageHeading
    }

    return {
      page: this,
      name: this.name,
      pageTitle,
      sectionTitle,
      showTitle,
      components,
      errors,
      isStartPage: false,
      serviceUrl,
      feedbackLink: this.getFeedbackLink(),
      phaseTag: this.getPhaseTag()
    }
  }

  get next(): PageLink[] {
    if (!hasNext(this.pageDef)) {
      return []
    }

    return this.pageDef.next
      .map((next) => {
        const { path } = next

        const page = this.model.pages.find((page) => {
          return path === page.path
        })

        if (!page) {
          return undefined
        }

        return {
          ...next,
          page
        }
      })
      .filter((v) => !!v)
  }

  /**
   * @param state - the values currently stored in a users session
   */
  getNextPage(state: FormSubmissionState): PageControllerClass | undefined {
    const { conditions } = this.model

    let defaultLink: PageLink | undefined
    const nextLink = this.next.find((link) => {
      const { condition } = link

      if (condition && condition in conditions) {
        return conditions[condition]?.fn(state) ?? false
      }

      defaultLink = link
      return false
    })

    return nextLink?.page ?? defaultLink?.page
  }

  /**
   * returns the path to the next page
   */
  getNext(state: FormSubmissionState) {
    const nextPage = this.getNextPage(state)

    if (nextPage) {
      return `/${this.model.basePath || ''}${nextPage.path}`
    }

    return this.defaultNextPath
  }

  /**
   * gets the state for the values that can be entered on just this page
   */
  getFormDataFromState(state: FormSubmissionState): FormPayload {
    return {
      ...this.components.getFormDataFromState(state)
    }
  }

  getStateFromValidForm(
    request: FormRequestPayload,
    payload: FormRequestPayload['payload']
  ) {
    return this.components.getStateFromValidForm(payload)
  }

  /**
   * Parses the errors from {@link Schema.validate} so they can be rendered by govuk-frontend templates
   * @param validationResult - provided by {@link Schema.validate}
   */
  getErrors(
    validationResult?: Pick<ValidationResult, 'error'>
  ): FormSubmissionErrors | undefined {
    if (validationResult?.error) {
      return {
        titleText: this.errorSummaryTitle,
        errorList: validationResult.error.details.map((err) =>
          this.getError(err)
        )
      }
    }

    return undefined
  }

  protected getError(err: ValidationErrorItem): FormSubmissionError {
    const name = err.context?.key ?? ''

    const isoRegex =
      /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/

    return {
      path: err.path,
      href: `#${name}`,
      name,
      text: err.message.replace(isoRegex, (text) => {
        return format(parseISO(text), 'd MMMM yyyy')
      }),
      context: err.context
    }
  }

  /**
   * Runs {@link Schema.validate}
   * @param value - user's answers
   * @param schema - which schema to validate against
   */
  validate<ValueType extends FormPayload | FormSubmissionState>(
    value: ValueType,
    schema: ObjectSchema<ValueType>
  ): FormValidationResult<ValueType> {
    const result = schema.validate(value, this.validationOptions)

    if (result.error) {
      return {
        value: result.value,
        errors: this.getErrors(result)
      }
    }

    return {
      value: result.value
    }
  }

  validateForm(payload: FormPayload) {
    return this.validate(payload, this.formSchema)
  }

  validateState(newState: FormSubmissionState) {
    return this.validate(newState, this.stateSchema)
  }

  /**
   * Returns an async function. This is called in plugin.ts when there is a GET request at `/{id}/{path*}`
   */
  getConditionEvaluationContext(model: FormModel, state: FormSubmissionState) {
    let relevantState: FormState = {}
    // Start at our startPage
    let nextPage = model.startPage

    // While the current page isn't null
    while (nextPage != null) {
      // Either get the current state or the current state of the section if this page belongs to a section
      const newValue: Record<string, FormState | FormStateValue> = {}

      if (!hasRepeater(nextPage.pageDef)) {
        // Iterate all components on this page and pull out the saved values from the state
        for (const component of nextPage.components.formItems) {
          const { name, options } = component

          const value = component.getFormValueFromState(state)

          /**
           * For evaluation context purposes, optional {@link CheckboxesField}
           * with an undefined value (i.e. nothing selected) should default to [].
           * This way conditions are not evaluated against `undefined` which throws errors.
           * Currently these errors are caught and the evaluation returns default `false`.
           * @see {@link PageControllerBase.getNextPage} for `undefined` return value
           * @see {@link FormModel.makeCondition} for try/catch block with default `false`
           * For negative conditions this is a problem because E.g.
           * The condition: 'selectedchecks' does not contain 'someval'
           * should return true IF 'selectedchecks' is undefined, not throw and return false.
           * Similarly for optional {@link RadiosField}, the evaluation context should default to null.
           */
          if (
            value === undefined &&
            component instanceof CheckboxesField &&
            !options.required
          ) {
            newValue[name] = []
          } else if (
            value === undefined &&
            component instanceof RadiosField &&
            !options.required
          ) {
            newValue[name] = null
          } else if (component instanceof DatePartsField) {
            newValue[name] = component.getConditionEvaluationStateValue(state)
          }

          newValue[name] ??= value ?? null
        }

        // Combine our stored values with the existing relevantState that we've been building up
        relevantState = merge(relevantState, newValue)
      }

      // By passing our current relevantState to getNextPage, we will check if we can navigate to this next page (including doing any condition checks if applicable)
      nextPage = nextPage.getNextPage(relevantState)
      // If a nextPage is returned, we must have taken that route through the form so continue our iteration with the new page
    }

    return relevantState
  }

  async getState(request: FormRequest | FormRequestPayload) {
    const { cacheService } = request.services([])
    const state = await cacheService.getState(request)

    return state
  }

  async setState(
    request: FormRequest | FormRequestPayload,
    state: FormSubmissionState
  ) {
    const { cacheService } = request.services([])
    return cacheService.mergeState(request, state)
  }

  makeGetRouteHandler(): (
    request: FormRequest,
    h: ResponseToolkit<FormRequestRefs>
  ) => Promise<ResponseObject | Boom> {
    return async (request, h) => {
      const { cacheService } = request.services([])
      const state = await this.getState(request)
      const progress = state.progress ?? []
      const startPage = this.model.def.startPage
      const payload = this.getFormDataFromState(state)
      const isStartPage = this.path === `${startPage}`
      const shouldRedirectToStartPage = !progress.length && !isStartPage

      if (shouldRedirectToStartPage) {
        return startPage?.startsWith('http')
          ? redirectTo(h, startPage)
          : redirectTo(h, `/${this.model.basePath}${startPage}`)
      }

      const viewModel = this.getViewModel(request, payload)

      viewModel.startPage = startPage?.startsWith('http')
        ? redirectTo(h, startPage)
        : redirectTo(h, `/${this.model.basePath}${startPage}`)

      /**
       * Content components can be hidden based on a condition. If the condition evaluates to true, it is safe to be kept, otherwise discard it
       */
      // Calculate our relevantState, which will filter out previously input answers that are no longer relevant to this user journey
      const relevantState = this.getConditionEvaluationContext(
        this.model,
        state
      )

      // Filter our components based on their conditions using our calculated state
      viewModel.components = viewModel.components.filter((component) => {
        if (
          (!!component.model.content ||
            component.type === ComponentType.Details) &&
          component.model.condition
        ) {
          const condition = this.model.conditions[component.model.condition]
          return condition?.fn(relevantState)
        }
        return true
      })

      /**
       * For conditional reveal components (which we no longer support until GDS resolves the related accessibility issues {@link https://github.com/alphagov/govuk-frontend/issues/1991}
       */
      viewModel.components = viewModel.components.map((component) => {
        const evaluatedComponent = component
        const content = evaluatedComponent.model.content
        if (content instanceof Array) {
          evaluatedComponent.model.content = content.filter((item) =>
            item.condition
              ? this.model.conditions[item.condition]?.fn(relevantState)
              : true
          )
        }
        // apply condition to items for radios, checkboxes etc
        const items = evaluatedComponent.model.items

        if (items instanceof Array) {
          evaluatedComponent.model.items = items.filter((item) =>
            item.condition
              ? this.model.conditions[item.condition]?.fn(relevantState)
              : true
          )
        }

        return evaluatedComponent
      })

      await this.updateProgress(progress, request, cacheService)

      viewModel.backLink = this.getBackLink(progress)

      viewModel.notificationEmailWarning =
        await this.buildMissingEmailWarningModel(request, isStartPage)

      return h.view(this.viewName, viewModel)
    }
  }

  async buildMissingEmailWarningModel(
    request: FormRequest,
    isStartPage?: boolean
  ): Promise<PageViewModel['notificationEmailWarning']> {
    const { params } = request
    // Warn the user if the form has no notification email set only on start page and summary page
    if (isStartPage || params.path === 'summary') {
      const { slug } = params
      const { notificationEmail } = await getFormMetadata(slug)

      if (!notificationEmail) {
        return {
          slug,
          designerUrl
        }
      }
    }
  }

  /**
   * Updates the progress history stack.
   * Used for when a user clicks the "back" link.
   * Progress is stored in the state.
   */
  protected async updateProgress(
    progress: string[],
    request: FormRequest,
    cacheService: CacheService
  ) {
    const lastVisited = progress.at(-1)
    const currentPath = `${request.path.substring(1)}${request.url.search}`

    if (!lastVisited?.startsWith(currentPath)) {
      if (progress.at(-2) === currentPath) {
        progress.pop()
      } else {
        progress.push(currentPath)

        // Ensure progress history doesn't grow too large
        // by curtailing the array to max length of 100
        const MAX_PROGRESS_ENTRIES = 100

        if (progress.length > MAX_PROGRESS_ENTRIES) {
          progress.shift()
        }
      }
    }

    await cacheService.mergeState(request, { progress })
  }

  /**
   * Get the back link for a given progress.
   */
  protected getBackLink(progress: string[]) {
    return progress.at(-2)
  }

  protected getPayload(request: FormRequestPayload) {
    return request.payload
  }

  makePostRouteHandler(): (
    request: FormRequestPayload,
    h: ResponseToolkit<FormRequestPayloadRefs>
  ) => Promise<ResponseObject | Boom> {
    return async (request, h) => {
      const formPayload = this.getPayload(request)
      const formResult = this.validateForm(formPayload)

      let state = await this.getState(request)
      const progress = state.progress ?? []

      // Sanitised payload after validation
      const payload = formResult.value ?? {}

      /**
       * If there are any errors, render the page with the parsed errors
       */
      if (formResult.errors) {
        // TODO:- refactor to match POST REDIRECT GET pattern.
        return this.renderWithErrors(
          request,
          h,
          payload,
          progress,
          formResult.errors
        )
      }

      const newState = this.getStateFromValidForm(request, payload)
      const stateResult = this.validateState(newState)

      if (stateResult.errors) {
        return this.renderWithErrors(
          request,
          h,
          payload,
          progress,
          stateResult.errors
        )
      }

      if (stateResult.value) {
        state = await this.setState(request, stateResult.value)
      }

      // This is required to ensure we don't navigate
      // to an incorrect page based on stale state values
      const relevantState = this.getConditionEvaluationContext(
        this.model,
        state
      )

      return this.proceed(request, h, relevantState)
    }
  }

  protected getFeedbackLink() {
    const { feedback } = this.def

    // setting the feedbackLink to undefined here for feedback forms prevents the feedback link from being shown
    let feedbackLink = feedback?.emailAddress
      ? `mailto:${feedback.emailAddress}`
      : feedback?.url

    if (!feedbackLink) {
      feedbackLink = config.get('feedbackLink')
    }

    return encodeUrl(feedbackLink)
  }

  protected getPhaseTag() {
    const { phaseBanner } = this.def
    return phaseBanner?.phase ?? config.get('phaseTag')
  }

  makeGetRoute() {
    return {
      method: 'get',
      path: this.path,
      options: this.getRouteOptions,
      handler: this.makeGetRouteHandler()
    } satisfies ServerRoute<FormRequestRefs>
  }

  makePostRoute() {
    return {
      method: 'post',
      path: this.path,
      options: this.postRouteOptions,
      handler: this.makePostRouteHandler()
    } satisfies ServerRoute<FormRequestPayloadRefs>
  }

  findPageByPath(path: string) {
    return this.model.pages.find((page) => page.path === path)
  }

  /**
   * TODO:- proceed is interfering with subclasses
   */
  proceed(
    request: FormRequest | FormRequestPayload,
    h:
      | ResponseToolkit<FormRequestRefs>
      | ResponseToolkit<FormRequestPayloadRefs>,
    state: FormSubmissionState
  ) {
    return proceed(request, h, this.getNext(state))
  }

  get defaultNextPath() {
    return `/${this.model.basePath || ''}/summary`
  }

  get validationOptions() {
    return validationOptions
  }

  get conditionOptions() {
    return this.model.conditionOptions
  }

  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   */
  get getRouteOptions(): RouteOptions<FormRequestRefs> {
    return {}
  }

  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   */
  get postRouteOptions(): RouteOptions<FormRequestPayloadRefs> {
    return {}
  }

  get formSchema() {
    return this[FORM_SCHEMA]
  }

  set formSchema(value) {
    this[FORM_SCHEMA] = value
  }

  get stateSchema() {
    return this[STATE_SCHEMA]
  }

  set stateSchema(value) {
    this[STATE_SCHEMA] = value
  }

  protected renderWithErrors(
    request: FormRequest | FormRequestPayload,
    h:
      | ResponseToolkit<FormRequestRefs>
      | ResponseToolkit<FormRequestPayloadRefs>,
    payload: FormPayload,
    progress: string[],
    errors?: FormSubmissionErrors
  ) {
    const viewModel = this.getViewModel(request, payload, errors)

    viewModel.backLink = progress[progress.length - 2]

    return h.view(this.viewName, viewModel)
  }
}

export interface PageLink extends Link {
  page: PageControllerClass
}
