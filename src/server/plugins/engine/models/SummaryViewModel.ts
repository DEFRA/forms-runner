import { type ValidationResult } from 'joi'

import { type FormComponentFieldClass } from '~/src/server/plugins/engine/components/helpers.js'
import { redirectUrl } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type Detail,
  type DetailItem
} from '~/src/server/plugins/engine/models/types.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FormState,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import {
  type FormQuery,
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

export class SummaryViewModel {
  /**
   * Responsible for parsing state values to the govuk-frontend summary list template
   */

  pageTitle: string
  declaration?: string
  skipSummary?: boolean
  result: ValidationResult<FormSubmissionState>
  details: Detail[]
  relevantPages: PageControllerClass[]
  state: FormSubmissionState
  value: FormSubmissionState
  name: string | undefined
  backLink?: string
  feedbackLink?: string
  phaseTag?: string
  errors:
    | {
        path: string
        name: string
        message: string
      }[]
    | undefined

  serviceUrl: string
  showErrorSummary?: boolean
  constructor(
    pageTitle: string,
    model: FormModel,
    state: FormSubmissionState,
    relevantState: FormSubmissionState,
    request: FormRequest | FormRequestPayload
  ) {
    this.pageTitle = pageTitle
    this.serviceUrl = `/${model.basePath}`
    this.name = model.def.name
    const relevantPages = this.getRelevantPages(model, relevantState)
    const details = this.summaryDetails(request, model, state, relevantPages)
    const { def } = model
    this.declaration = def.declaration
    this.skipSummary = def.skipSummary

    const schema = model.makeFilteredSchema(relevantPages)
    const result = schema.validate(state, {
      abortEarly: false,
      stripUnknown: true
    })

    if (result.error) {
      this.processErrors(result, details)
    }

    this.result = result
    this.details = details
    this.relevantPages = relevantPages
    this.state = state
    this.value = result.value
  }

  private processErrors(result: ValidationResult, details: Detail[]) {
    this.errors = result.error?.details.map((err) => {
      const name = err.path[err.path.length - 1] ?? ''

      return {
        path: err.path.join('.'),
        name: name.toString(),
        message: err.message
      }
    })

    details.forEach((detail) => {
      const sectionErr = this.errors?.find((err) => err.path === detail.name)

      detail.items.forEach((item) => {
        if (sectionErr) {
          item.inError = true
          return
        }

        const err = this.errors?.find(
          (err) =>
            err.path ===
            (detail.name ? detail.name + '.' + item.name : item.name)
        )
        if (err) {
          item.inError = true
        }
      })
    })
  }

  private summaryDetails(
    request: FormRequest | FormRequestPayload,
    model: FormModel,
    state: FormSubmissionState,
    relevantPages: PageControllerClass[]
  ) {
    const details: Detail[] = []

    ;[undefined, ...model.sections].forEach((section) => {
      const items: Detail['items'] = []

      const sectionPages = relevantPages.filter(
        (page) => page.section === section
      )

      sectionPages.forEach((page) => {
        if (page instanceof RepeatPageController) {
          const { options } = page.repeat
          const { name, title } = options
          const rawValue = state[name]

          const isInitialised = Array.isArray(rawValue)
          const value = isInitialised ? rawValue.length.toString() : '0'

          const pagePath = `/${model.basePath}${page.path}`
          const repeatSummaryPath = page.getSummaryPath(request)
          const returnUrl = redirectUrl(page.defaultNextPath)

          // Path to change link
          const url = redirectUrl(
            isInitialised ? repeatSummaryPath : pagePath,
            { returnUrl }
          )

          items.push({
            name,
            title,
            label: isInitialised ? `${title}s added` : title,
            value: `You added ${value} ${title}${value === '1' ? '' : 's'}`,
            rawValue: state[name],
            page,
            url
          })
        } else {
          for (const component of page.components.formItems) {
            items.push(Item(page, component, model, state))
          }
        }
      })

      if (items.length) {
        details.push({
          name: section?.name,
          title: section?.title,
          items
        })
      }
    })

    return details
  }

  private getRelevantPages(model: FormModel, state: FormSubmissionState) {
    let nextPage = model.startPage

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

/**
 * Creates an Item object for Details
 */
function Item(
  page: PageControllerClass,
  component: FormComponentFieldClass,
  model: FormModel,
  state: FormState,
  params?: FormQuery
): DetailItem {
  const { name, title } = component
  const { basePath } = model

  const pagePath = `/${basePath}${page.path}`
  const returnUrl = redirectUrl(page.getSummaryPath())

  // Path to change link
  const url = redirectUrl(pagePath, { returnUrl, ...params })

  return {
    name,
    title,
    label: title,
    type: component.type,
    value: component.getDisplayStringFromState(state),
    markdownValue: component.getMarkdownStringFromState(state),
    rawValue: state[name],
    page,
    url
  }
}
