import {
  ComponentType,
  ControllerPath,
  hasComponents,
  hasNext,
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
import joi, { type ValidationErrorItem } from 'joi'

import { config } from '~/src/config/index.js'
import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import {
  encodeUrl,
  getErrors,
  getStartPath,
  normalisePath,
  proceed
} from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import {
  type FormContext,
  type FormContextProgress,
  type FormPayload,
  type FormSubmissionError,
  type FormSubmissionState,
  type PageViewModel
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'

export class PageControllerBase {
  /**
   * The base class for all page controllers. Page controllers are responsible for generating the get and post route handlers when a user navigates to `/{id}/{path*}`.
   */
  def: FormDefinition
  name?: string
  model: FormModel
  pageDef: Page
  title: string
  condition?: string
  section?: Section
  collection: ComponentCollection
  errorSummaryTitle = 'There is a problem'
  viewName = 'index'

  constructor(model: FormModel, pageDef: Page) {
    const { def } = model

    this.def = def
    this.name = def.name
    this.model = model
    this.pageDef = pageDef
    this.title = pageDef.title

    // Resolve section
    this.section = model.sections.find(
      (section) => section.name === pageDef.section
    )

    // Components collection
    this.collection = new ComponentCollection(
      hasComponents(pageDef) ? pageDef.components : [],
      { model, page: this }
    )

    this.collection.formSchema = this.collection.formSchema.keys({
      crumb: joi.string().optional().allow('')
    })
  }

  get path() {
    return this.pageDef.path
  }

  get href() {
    return this.getHref(this.path)
  }

  get keys() {
    return this.collection.keys
  }

  get next(): Link[] {
    const { def, pageDef } = this

    if (!hasNext(pageDef)) {
      return []
    }

    // Remove stale links
    return pageDef.next.filter(({ path }) => {
      const linkPath = normalisePath(path)

      return def.pages.some((page) => {
        const pagePath = normalisePath(page.path)
        return pagePath === linkPath
      })
    })
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
    errors?: FormSubmissionError[]
  ): PageViewModel {
    let showTitle = true

    let { title: pageTitle, section } = this
    const sectionTitle = section?.hideTitle !== true ? section?.title : ''

    const components = this.collection.getViewModel(payload, errors)
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
            this.collection.fields.at(0)?.options.required === false

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
      serviceUrl: this.getHref('/'),
      feedbackLink: this.getFeedbackLink(),
      phaseTag: this.getPhaseTag()
    }
  }

  getHref(path: string) {
    const { model } = this
    return `/${model.basePath}${path}`
  }

  getStartPath() {
    return getStartPath(this.model)
  }

  getRelevantPath(context: FormContextProgress) {
    const { paths } = context

    const startPath = this.getStartPath()
    const relevantPath = paths.at(-1) ?? startPath

    return !paths.length
      ? startPath // First possible path
      : relevantPath // Last possible path
  }

  getSummaryPath() {
    return ControllerPath.Summary.valueOf()
  }

  getStatusPath() {
    return ControllerPath.Status.valueOf()
  }

  /**
   * Apply conditions to evaluation state to determine next page path
   */
  getNextPath(context: FormContext) {
    const { model, next, path } = this
    const { evaluationState } = context

    const summaryPath = this.getSummaryPath()
    const statusPath = this.getStatusPath()

    // Walk from summary page (no next links) to status page
    let defaultPath = path === summaryPath ? statusPath : undefined

    const nextLink = next.find((link) => {
      const { condition } = link

      if (condition) {
        return model.conditions[condition]?.fn(evaluationState) ?? false
      }

      defaultPath = link.path
      return false
    })

    return nextLink?.path ?? defaultPath
  }

  /**
   * gets the state for the values that can be entered on just this page
   */
  getFormDataFromState(state: FormSubmissionState): FormPayload {
    return {
      ...this.collection.getFormDataFromState(state)
    }
  }

  getStateFromValidForm(
    request: FormRequestPayload,
    payload: FormRequestPayload['payload']
  ) {
    return this.collection.getStateFromValidForm(payload)
  }

  getErrors(details?: ValidationErrorItem[]) {
    return getErrors(details)
  }

  async getState(request: FormRequest | FormRequestPayload) {
    const { cacheService } = request.services([])
    return cacheService.getState(request)
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
      const { model, path, viewName } = this

      const state = await this.getState(request)
      const context = model.getFormContext(request, state)

      // Redirect back to last relevant page
      if (!context.force && !context.paths.includes(path)) {
        return this.proceed(request, h, this.getRelevantPath(context))
      }

      const payload = this.getFormDataFromState(context.state)
      const viewModel = this.getViewModel(request, payload)

      /**
       * Content components can be hidden based on a condition. If the condition evaluates to true, it is safe to be kept, otherwise discard it
       */

      // Evaluation form state only (filtered by visited paths)
      const { evaluationState } = context

      // Filter our components based on their conditions using our evaluated state
      viewModel.components = viewModel.components.filter((component) => {
        if (
          (!!component.model.content ||
            component.type === ComponentType.Details) &&
          component.model.condition
        ) {
          const condition = model.conditions[component.model.condition]
          return condition?.fn(evaluationState)
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
              ? model.conditions[item.condition]?.fn(evaluationState)
              : true
          )
        }
        // apply condition to items for radios, checkboxes etc
        const items = evaluatedComponent.model.items

        if (items instanceof Array) {
          evaluatedComponent.model.items = items.filter((item) =>
            item.condition
              ? model.conditions[item.condition]?.fn(evaluationState)
              : true
          )
        }

        return evaluatedComponent
      })

      const { progress = [] } = context.state
      await this.updateProgress(progress, request)

      viewModel.backLink = this.getBackLink(progress)

      viewModel.notificationEmailWarning =
        await this.buildMissingEmailWarningModel(request)

      return h.view(viewName, viewModel)
    }
  }

  async buildMissingEmailWarningModel(
    request: FormRequest
  ): Promise<PageViewModel['notificationEmailWarning']> {
    const { path } = this
    const { params } = request

    const startPath = this.getStartPath()
    const summaryPath = this.getSummaryPath()

    // Warn the user if the form has no notification email set only on start page and summary page
    if ([startPath, summaryPath].includes(path)) {
      const { notificationEmail } = await getFormMetadata(params.slug)

      if (!notificationEmail) {
        return {
          slug: params.slug,
          designerUrl: config.get('designerUrl')
        }
      }
    }
  }

  /**
   * Updates the progress history stack.
   * Used for when a user clicks the "back" link.
   * Progress is stored in the state.
   */
  protected async updateProgress(progress: string[], request: FormRequest) {
    const { cacheService } = request.services([])

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

  makePostRouteHandler(): (
    request: FormRequestPayload,
    h: ResponseToolkit<FormRequestPayloadRefs>
  ) => Promise<ResponseObject | Boom> {
    return async (request, h) => {
      const { model } = this

      const state = await this.getState(request)
      const context = model.getFormContext(request, state, {
        validate: false
      })

      // Sanitised payload after validation
      const { value: payload, errors } = this.validate(request)

      /**
       * If there are any errors, render the page with the parsed errors
       * @todo Refactor to match POST REDIRECT GET pattern
       */
      if (errors) {
        const { progress = [] } = context.state
        return this.renderWithErrors(request, h, payload, progress, errors)
      }

      // Convert and save sanitised payload to state
      const pageState = this.getStateFromValidForm(request, payload)
      const formState = await this.setState(request, pageState)

      return this.proceed(
        request,
        h,

        // This is required to ensure we don't navigate
        // to an incorrect page based on stale state values
        this.getNextPath(
          model.getFormContext(request, formState, {
            validate: false
          })
        )
      )
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
      path: this.pageDef.path,
      options: this.getRouteOptions,
      handler: this.makeGetRouteHandler()
    } satisfies ServerRoute<FormRequestRefs>
  }

  makePostRoute() {
    return {
      method: 'post',
      path: this.pageDef.path,
      options: this.postRouteOptions,
      handler: this.makePostRouteHandler()
    } satisfies ServerRoute<FormRequestPayloadRefs>
  }

  validate(request: FormRequestPayload) {
    return this.collection.validate(request.payload)
  }

  proceed(
    request: FormRequest | FormRequestPayload,
    h:
      | ResponseToolkit<FormRequestRefs>
      | ResponseToolkit<FormRequestPayloadRefs>,
    nextPath?: string
  ) {
    // Continue to same page
    if (!nextPath) {
      return proceed(request, h, `${request.path}${request.url.search}`)
    }

    // Continue to next page
    return proceed(request, h, this.getHref(`${nextPath}${request.url.search}`))
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

  protected renderWithErrors(
    request: FormRequest | FormRequestPayload,
    h:
      | ResponseToolkit<FormRequestRefs>
      | ResponseToolkit<FormRequestPayloadRefs>,
    payload: FormPayload,
    progress: string[],
    errors?: FormSubmissionError[]
  ) {
    const { viewName } = this

    const viewModel = this.getViewModel(request, payload, errors)

    viewModel.errors = this.collection.getErrors(viewModel.errors)
    viewModel.backLink = this.getBackLink(progress)

    return h.view(viewName, viewModel)
  }
}
