import {
  ComponentType,
  hasComponents,
  hasNext,
  hasRepeater,
  type Link,
  type Page
} from '@defra/forms-model'
import { type ResponseToolkit, type RouteOptions } from '@hapi/hapi'
import { type ValidationErrorItem } from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import { type BackLink } from '~/src/server/plugins/engine/components/types.js'
import {
  getErrors,
  normalisePath,
  proceed
} from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import {
  type FormContext,
  type FormContextRequest,
  type FormPageViewModel,
  type FormParams,
  type FormPayload,
  type FormState,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'
import {
  actionSchema,
  crumbSchema,
  paramsSchema
} from '~/src/server/schemas/index.js'
import { merge } from '~/src/server/services/cacheService.js'

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
      crumb: crumbSchema,
      action: actionSchema
    })
  }

  getItemId(request?: FormContextRequest) {
    const { itemId } = this.getFormParams(request)
    return itemId ?? request?.params.itemId
  }

  /**
   * Used for mapping form payloads and errors to govuk-frontend's template api, so a page can be rendered
   * @param request - the hapi request
   * @param context - the form context
   */
  getViewModel(
    request: FormContextRequest,
    context: FormContext
  ): FormPageViewModel {
    const { collection, viewModel } = this
    const { query } = request
    const { payload, errors } = context

    let { pageTitle, showTitle } = viewModel

    const components = collection.getViewModel(payload, errors, query)
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
      backLink: this.getBackLink(request, context),
      context,
      showTitle,
      components,
      errors
    }
  }

  getRelevantPath(
    request: FormRequest | FormRequestPayload,
    context: FormContext
  ) {
    const { paths } = context

    const startPath = this.getStartPath()
    const relevantPath = paths.at(-1) ?? startPath

    return !paths.length
      ? startPath // First possible path
      : relevantPath // Last possible path
  }

  /**
   * Apply conditions to evaluation state to determine next page
   */
  getNextPath(context: FormContext) {
    const { state } = context
    // PAGE WALK VALIDATION APPROACH
    // const { pages } = this.model
    // const nextPage = pages
    //   .filter((page) => page !== this)
    //   .find((page) => {
    //     const { collection, condition } = page

    //     // The "next" page is the first found that's either unconditional
    //     // or has a condition that evaluates to "true" AND whose schema is unfulfilled
    //     if (condition) {
    //       const res = condition.validate(evaluationState, {
    //         allowUnknown: true
    //       })
    //       if (res.error) return false
    //     }

    //     if (page.pageDef.controller === ControllerType.Terminal) {
    //       return true
    //     }

    //     const res2 = collection.stateSchema.validate(evaluationState, {
    //       allowUnknown: true
    //     })

    //     return res2.error
    //   })

    // return nextPage

    // MODEL VALIDATION APPROACH
    const schema = this.model.makeSchema()
    const res = schema.validate(state, {
      allowUnknown: true
    })

    if (res.error) {
      const { pages } = this.model
      const nextPage = pages.find(
        (page) => page.id === res.error.details.at(0)?.path.at(0)
      )

      return nextPage?.path
    }
  }

  /**
   * Gets the form payload (from state) for this page only
   */
  getFormDataFromState(
    request: FormContextRequest | undefined,
    state: FormSubmissionState
  ): FormPayload {
    const { collection } = this

    // Form params from request
    const params = this.getFormParams(request)

    // Form payload from state
    const payload = collection.getFormDataFromState(state)

    return {
      ...params,
      ...payload
    }
  }

  /**
   * Gets form params (from payload) for this page only
   */
  getFormParams(request?: FormContextRequest): FormParams {
    const { payload } = request ?? {}

    const result = paramsSchema.validate(payload, {
      abortEarly: false,
      stripUnknown: true
    })

    return result.value as FormParams
  }

  getStateFromValidForm(
    request: FormContextRequest,
    state: FormSubmissionState,
    payload: FormPayload
  ): FormState {
    return this.collection.getStateFromValidForm(payload)
  }

  getErrors(details?: ValidationErrorItem[]) {
    return getErrors(details)
  }

  async getState(request: FormRequest | FormRequestPayload) {
    const { query } = request

    // Skip get for preview URL direct access
    if ('force' in query) {
      return {}
    }

    const { cacheService } = request.services([])
    return cacheService.getState(request)
  }

  async setState(
    request: FormRequest | FormRequestPayload,
    state: FormSubmissionState
  ) {
    const { query } = request

    // Skip set for preview URL direct access
    if ('force' in query) {
      return state
    }

    const { cacheService } = request.services([])
    return cacheService.setState(request, state)
  }

  async mergeState(
    request: FormRequest | FormRequestPayload,
    state: FormSubmissionState,
    update: object
  ) {
    const { query } = request

    // Merge state before set
    const updated = merge(state, update)

    // Skip set for preview URL direct access
    if ('force' in query) {
      return updated
    }

    const { cacheService } = request.services([])
    return cacheService.setState(request, updated)
  }

  makeGetRouteHandler() {
    return async (
      request: FormRequest,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { collection, model, viewName } = this
      const { evaluationState } = context

      const viewModel = this.getViewModel(request, context)
      viewModel.errors = collection.getErrors(viewModel.errors)

      /**
       * Content components can be hidden based on a condition. If the condition evaluates to true, it is safe to be kept, otherwise discard it
       */

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

      viewModel.hasMissingNotificationEmail =
        await this.hasMissingNotificationEmail(request, context)

      return h.view(viewName, viewModel)
    }
  }

  async hasMissingNotificationEmail(
    request: FormRequest,
    context: FormContext
  ) {
    const { path } = this
    const { params } = request
    const { isForceAccess } = context

    const startPath = this.getStartPath()
    const summaryPath = this.getSummaryPath()

    // Warn the user if the form has no notification email set only on start page and summary page
    if ([startPath, summaryPath].includes(path) && !isForceAccess) {
      const { notificationEmail } = await getFormMetadata(params.slug)
      return !notificationEmail
    }

    return false
  }

  /**
   * Get the back link for a given progress.
   */
  protected getBackLink(
    request: FormContextRequest,
    context: FormContext
  ): BackLink | undefined {
    const { pageDef } = this
    const { path, query } = request
    const { returnUrl } = query
    const { paths } = context

    const itemId = this.getItemId(request)

    // Check answers back link
    if (returnUrl) {
      return {
        text:
          hasRepeater(pageDef) && itemId
            ? 'Go back to add another'
            : 'Go back to check answers',
        href: returnUrl
      }
    }

    // Item delete pages etc
    const backPath =
      itemId && !path.endsWith(itemId)
        ? paths.at(-1) // Back to main page
        : paths.at(-2) // Back to previous page

    // No back link
    if (!backPath) {
      return
    }

    // Default back link
    return {
      text: 'Back',
      href: this.getHref(backPath)
    }
  }

  makePostRouteHandler() {
    return async (
      request: FormRequestPayload,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { collection, viewName } = this
      const { isForceAccess, state } = context

      /**
       * If there are any errors, render the page with the parsed errors
       * @todo Refactor to match POST REDIRECT GET pattern
       */
      if (context.errors || isForceAccess) {
        const viewModel = this.getViewModel(request, context)
        viewModel.errors = collection.getErrors(viewModel.errors)

        return h.view(viewName, viewModel)
      }

      // Save and proceed
      await this.setState(request, state)
      return this.proceed(request, h, this.getNextPath(context))
    }
  }

  proceed(
    request: FormContextRequest,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>,
    nextPath?: string
  ) {
    const nextUrl = nextPath
      ? this.getHref(nextPath) // Redirect to next page
      : this.href // Redirect to current page (refresh)

    return proceed(request, h, nextUrl)
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
}
