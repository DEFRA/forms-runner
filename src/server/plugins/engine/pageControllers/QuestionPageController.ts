import {
  ComponentType,
  hasComponents,
  hasNext,
  type Link,
  type Page
} from '@defra/forms-model'
import { type ResponseToolkit, type RouteOptions } from '@hapi/hapi'
import joi, { type ValidationErrorItem } from 'joi'

import { config } from '~/src/config/index.js'
import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import {
  getErrors,
  normalisePath,
  proceed
} from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import {
  type FormPageViewModel,
  type FormPayload,
  type FormState,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'

export class QuestionPageController extends PageController {
  collection: ComponentCollection
  errorSummaryTitle = 'There is a problem'

  constructor(model: FormModel, pageDef: Page) {
    super(model, pageDef)

    // Components collection
    this.collection = new ComponentCollection(
      hasComponents(pageDef) ? pageDef.components : [],
      { model, page: this }
    )

    this.collection.formSchema = this.collection.formSchema.keys({
      crumb: joi.string().optional().allow('')
    })
  }

  get next(): Link[] {
    const { def, pageDef } = this

    if (!hasNext(pageDef)) {
      return []
    }

    // Remove stale links
    return pageDef.next.filter(({ path }) =>
      def.pages.some((page) => normalisePath(path) === normalisePath(page.path))
    )
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
  ): FormPageViewModel {
    const { collection } = this

    const viewModel = super.getViewModel(request, payload, errors)
    let { pageTitle, showTitle } = viewModel

    const components = collection.getViewModel(payload, errors)
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
      ...viewModel,
      showTitle,
      components,
      errors
    }
  }

  /**
   * Apply conditions to evaluation state to determine next page
   */
  getNextPage(evaluationState: FormState): PageControllerClass | undefined {
    const { model, next } = this
    const { conditions } = model

    let defaultLink: Link | undefined
    const nextLink = next.find((link) => {
      const { condition } = link

      if (condition && condition in conditions) {
        return conditions[condition]?.fn(evaluationState) ?? false
      }

      defaultLink = link
      return false
    })

    const link = nextLink ?? defaultLink

    return model.pages
      .filter((page) => page instanceof QuestionPageController)
      .find((page) => normalisePath(page.path) === normalisePath(link?.path))
  }

  /**
   * Apply conditions to evaluation state to determine next page path
   */
  getNext(evaluationState: FormState) {
    const nextPage = this.getNextPage(evaluationState)

    if (nextPage) {
      return nextPage.href
    }

    return this.getSummaryPath()
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

  makeGetRouteHandler() {
    return async (
      request: FormRequest,
      h: ResponseToolkit<FormRequestRefs>
    ) => {
      const { model, path, viewName } = this

      const { startPage } = model.def

      const state = await this.getState(request)
      const progress = state.progress ?? []
      const isStartPage = path === startPage

      if (!progress.length && !isStartPage) {
        h.redirect(this.getStartPath())
      }

      const payload = this.getFormDataFromState(state)
      const viewModel = this.getViewModel(request, payload)

      /**
       * Content components can be hidden based on a condition. If the condition evaluates to true, it is safe to be kept, otherwise discard it
       */

      // Calculate our evaluation form state only (filtered by visited paths)
      const { evaluationState } = this.model.getFormContext(state, request)

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

      await this.updateProgress(progress, request)

      viewModel.backLink = this.getBackLink(progress)

      viewModel.notificationEmailWarning =
        await this.buildMissingEmailWarningModel(request)

      return h.view(viewName, viewModel)
    }
  }

  async buildMissingEmailWarningModel(
    request: FormRequest
  ): Promise<FormPageViewModel['notificationEmailWarning']> {
    const { href } = this
    const { params } = request

    const startPath = this.getStartPath()
    const summaryPath = this.getSummaryPath()

    // Warn the user if the form has no notification email set only on start page and summary page
    if ([startPath, summaryPath].includes(href)) {
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

  protected getPayload(request: FormRequestPayload) {
    return request.payload
  }

  makePostRouteHandler() {
    return async (
      request: FormRequest,
      h: ResponseToolkit<FormRequestRefs>
    ) => {
      const formPayload = this.getPayload(request)
      const formResult = this.collection.validate(formPayload)

      let state = await this.getState(request)
      const progress = state.progress ?? []

      // Sanitised payload after validation
      const payload = formResult.value

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

      const stateResult = this.collection.validate(
        this.getStateFromValidForm(request, payload),
        'stateSchema'
      )

      if (stateResult.errors) {
        return this.renderWithErrors(
          request,
          h,
          payload,
          progress,
          stateResult.errors
        )
      }

      state = await this.setState(request, stateResult.value)

      return this.proceed(request, h, state)
    }
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
    // This is required to ensure we don't navigate
    // to an incorrect page based on stale state values
    const { evaluationState } = this.model.getFormContext(state, request)

    return proceed(request, h, this.getNext(evaluationState))
  }

  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   */
  get getRouteOptions(): RouteOptions<FormRequestRefs> {
    return {
      ext: {
        onPostHandler: {
          method(_request, h) {
            return h.continue
          }
        }
      }
    }
  }

  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   */
  get postRouteOptions(): RouteOptions<FormRequestPayloadRefs> {
    return {
      payload: {
        parse: true,
        maxBytes: Number.MAX_SAFE_INTEGER,
        failAction: 'ignore'
      },
      ext: {
        onPostHandler: {
          method(_request, h) {
            return h.continue
          }
        }
      }
    }
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
