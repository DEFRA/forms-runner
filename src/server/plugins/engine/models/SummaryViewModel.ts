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
  type FormSubmissionState,
  type RepeatState
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
      const items: DetailItem[] = []

      const sectionPages = relevantPages.filter(
        (page) => page.section === section
      )

      sectionPages.forEach((page) => {
        const { formItems } = page.components

        if (page instanceof RepeatPageController) {
          addRepeaterItem(page, request, model, state, items)
        } else {
          for (const component of formItems) {
            const item = Item(page, model, state, component)
            if (items.find((cbItem) => cbItem.name === item.name)) return
            items.push(item)
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

function addRepeaterItem(
  page: RepeatPageController,
  request: FormRequest | FormRequestPayload,
  model: FormModel,
  state: FormSubmissionState,
  items: DetailItem[]
) {
  const { basePath } = model
  const { formItems } = page.components
  const { options } = page.repeat

  const rawValue = page.getListFromState(state)
  const hasItems = rawValue.length > 0
  const value = hasItems ? rawValue.length.toString() : '0'

  const pagePath = hasItems
    ? page.getSummaryPath(request)
    : `/${basePath}${page.path}`

  // Path to change link
  const url = redirectUrl(pagePath, {
    returnUrl: redirectUrl(page.defaultNextPath)
  })

  const subItems: DetailItem[][] = []

  rawValue.forEach((itemState) => {
    const sub: DetailItem[] = []

    for (const component of formItems) {
      const item = Item(page, model, itemState, component)
      if (sub.find((cbItem) => cbItem.name === item.name)) return
      sub.push(item)
    }

    subItems.push(sub)
  })

  items.push({
    name: options.name,
    title: options.title,
    label: hasItems ? `${options.title}s added` : options.title,
    value: `You added ${value} ${options.title}${value === '1' ? '' : 's'}`,
    rawValue,
    page,
    url,
    subItems
  })
}

/**
 * Creates an Item object for Details
 */
function Item(
  page: PageControllerClass,
  model: FormModel,
  state: FormState | RepeatState,
  component: FormComponentFieldClass,
  params?: FormQuery
) {
  const { basePath } = model

  const pagePath = `/${basePath}${page.path}`
  const returnUrl = redirectUrl(page.getSummaryPath())

  // Path to change link
  const url = redirectUrl(pagePath, { returnUrl, ...params })

  return {
    name: component.name,
    title: component.title,
    label: component.title,
    value: component.getDisplayStringFromState(state),
    markdownValue: component.getMarkdownStringFromState(state),
    rawValue: component.getFormValueFromState(state),
    type: component.type,
    page,
    url
  } satisfies DetailItem
}
