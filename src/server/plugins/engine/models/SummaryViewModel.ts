import { type ValidationResult } from 'joi'

import { type FormComponentFieldClass } from '~/src/server/plugins/engine/components/helpers.js'
import { getError, redirectUrl } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type Detail,
  type DetailItem
} from '~/src/server/plugins/engine/models/types.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FormState,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

export class SummaryViewModel {
  /**
   * Responsible for parsing state values to the govuk-frontend summary list template
   */

  pageTitle: string
  declaration?: string
  result: ValidationResult<FormSubmissionState>
  details: Detail[]
  relevantPages: PageControllerClass[]
  state: FormSubmissionState
  value: FormSubmissionState
  name: string | undefined
  backLink?: string
  feedbackLink?: string
  phaseTag?: string
  errors?: FormSubmissionError[]
  serviceUrl: string
  showErrorSummary?: boolean
  notificationEmailWarning?: {
    slug: string
    designerUrl: string
  }

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
    const errors = result.error?.details.map(getError) ?? []

    if (!errors.length) {
      this.errors = undefined
      return
    }

    details.forEach((detail) => {
      const sectionErr = errors.find(({ name }) => name === detail.name)

      detail.items.forEach((item) => {
        if (sectionErr) {
          item.inError = true
          return
        }

        const err = errors.find(({ name }) => {
          return (
            name === (detail.name ? `${detail.name}.${item.name}` : item.name)
          )
        })

        if (err) {
          item.inError = true
        }
      })
    })

    this.errors = errors
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
        if (page instanceof RepeatPageController) {
          addRepeaterItem(page, request, model, state, items)
        } else {
          for (const component of page.collection.fields) {
            const item = Item(component, state, page, model)
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
      if (nextPage.collection.fields.length) {
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
  const { options } = page.repeat
  const { name, title } = options
  const repeatSummaryPath = page.getSummaryPath(request)
  const path = `/${model.basePath}${page.path}`
  const rawValue = page.getListFromState(state)
  const hasItems = rawValue.length > 0
  const value = hasItems ? rawValue.length.toString() : '0'
  const url = redirectUrl(hasItems ? repeatSummaryPath : path, {
    returnUrl: redirectUrl(`/${model.basePath}/summary`)
  })

  const subItems: DetailItem[][] = []

  rawValue.forEach((itemState) => {
    const sub: DetailItem[] = []
    for (const component of page.collection.fields) {
      const item = Item(component, itemState, page, model)
      if (sub.find((cbItem) => cbItem.name === item.name)) return
      sub.push(item)
    }
    subItems.push(sub)
  })

  items.push({
    name,
    path: page.path,
    label: hasItems ? `${title}s added` : title,
    value: `You added ${value} ${title}${value === '1' ? '' : 's'}`,
    rawValue,
    url,
    title,
    subItems
  })
}

/**
 * Creates an Item object for Details
 */
function Item(
  component: FormComponentFieldClass,
  state: FormState,
  page: PageControllerClass,
  model: FormModel,
  params: { returnUrl: string } = {
    returnUrl: redirectUrl(`/${model.basePath}/summary`)
  }
) {
  return {
    name: component.name,
    path: page.path,
    label: component.title,
    value: component.getDisplayStringFromState(state),
    rawValue: component.getFormValueFromState(state),
    url: redirectUrl(`/${model.basePath}${page.path}`, params),
    type: component.type,
    title: component.title,
    dataType: component.dataType
  } as DetailItem
}
