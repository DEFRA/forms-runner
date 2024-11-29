import { type ValidationResult } from 'joi'

import { type Field } from '~/src/server/plugins/engine/components/helpers.js'
import { getError, redirectUrl } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type Detail,
  type DetailItem
} from '~/src/server/plugins/engine/models/types.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type CheckAnswers,
  type FormState,
  type FormSubmissionError,
  type FormSubmissionState,
  type SummaryListRow
} from '~/src/server/plugins/engine/types.js'
import { render } from '~/src/server/plugins/nunjucks/index.js'
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
  checkAnswers: CheckAnswers[]
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
    relevantState: FormState,
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
    const result = schema.validate(state, { ...opts, stripUnknown: true })

    // Format errors
    const errors = result.error?.details.map(getError)

    // Flag unanswered questions
    for (const { items } of details) {
      for (const item of items) {
        item.error = item.field?.getError(errors)
      }
    }

    const checkAnswers: CheckAnswers[] = details.map((detail): CheckAnswers => {
      const { items, title } = detail

      const rows = items.map((item): SummaryListRow => {
        const href = item.url

        const value = render.macro(
          'summaryValue',
          'partials/summary-value.html',
          {
            params: {
              href,
              label: item.label,
              value: item.value,
              error: item.error
            }
          }
        )

        const row: SummaryListRow = {
          key: {
            text: item.title
          },
          value: {
            html: value
          }
        }

        if (!item.error) {
          row.actions = {
            items: [
              {
                href,
                text: 'Change',
                classes: 'govuk-link--no-visited-state',
                visuallyHiddenText: item.label
              }
            ]
          }
        }

        return row
      })

      return {
        title: title ? { text: title } : undefined,
        summaryList: { rows }
      }
    })

    this.result = result
    this.details = details
    this.checkAnswers = checkAnswers
    this.relevantPages = relevantPages
    this.state = state
    this.value = result.value
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
  const values = page.getListFromState(state)
  const unit = values.length === 1 ? title : `${title}s`
  const url = redirectUrl(values.length ? repeatSummaryPath : path, {
    returnUrl: redirectUrl(`/${model.basePath}/summary`)
  })

  const subItems: DetailItem[][] = []

  values.forEach((itemState) => {
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
    label: title,
    title: values.length ? `${unit} added` : unit,
    value: `You added ${values.length} ${unit}`,
    rawValue: values,
    url,
    subItems
  })
}

/**
 * Creates an Item object for Details
 */
function Item(
  component: Field,
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
    field: component,
    url: redirectUrl(`/${model.basePath}${page.path}`, params),
    type: component.type,
    title: component.title,
    dataType: component.dataType
  } as DetailItem
}
