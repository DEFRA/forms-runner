import { type ValidationResult } from 'joi'

import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers.js'
import { getError, redirectUrl } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type Detail,
  type DetailItem,
  type DetailItemField,
  type DetailItemRepeat
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
    const { basePath, def } = model

    this.pageTitle = pageTitle
    this.serviceUrl = `/${basePath}`
    this.name = def.name
    this.declaration = def.declaration
    this.relevantPages = this.getRelevantPages(model, relevantState)

    const result = model
      .makeFilteredSchema(this.relevantPages)
      .validate(state, { ...opts, stripUnknown: true })

    // Format errors
    this.errors = result.error?.details.map(getError)
    this.details = this.summaryDetails(request, model, state)

    // Flag unanswered questions
    for (const { items } of this.details) {
      for (const item of items) {
        item.error = item.field?.getError(this.errors)
      }
    }

    this.checkAnswers = this.details.map((detail): CheckAnswers => {
      const { items, title } = detail

      const rows = items.map((item): SummaryListRow => {
        const returnUrl = redirectUrl(item.page.getSummaryPath())

        // Change link href
        const href = redirectUrl(
          'subItems' in item && item.subItems.length
            ? item.page.getSummaryPath(request)
            : `/${basePath}${item.page.path}`,
          { returnUrl }
        )

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
  }

  private summaryDetails(
    request: FormRequest | FormRequestPayload,
    model: FormModel,
    state: FormSubmissionState
  ) {
    const { relevantPages } = this
    const { sections } = model

    const details: Detail[] = []

    ;[undefined, ...sections].forEach((section) => {
      const items: DetailItem[] = []

      const sectionPages = relevantPages.filter(
        (page) => page.section === section
      )

      sectionPages.forEach((page) => {
        const { collection } = page

        if (page instanceof RepeatPageController) {
          items.push(ItemRepeat(page, state))
        } else {
          for (const field of collection.fields) {
            items.push(ItemField(page, state, field))
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

/**
 * Creates a repeater detail item
 * @see {@link DetailItemField}
 */
function ItemRepeat(
  page: RepeatPageController,
  state: FormState
): DetailItemRepeat {
  const { collection, repeat } = page
  const { name, title } = repeat.options

  const values = page.getListFromState(state)
  const unit = values.length === 1 ? title : `${title}s`

  return {
    name,
    label: title,
    title: values.length ? `${unit} added` : unit,
    value: `You added ${values.length} ${unit}`,
    state,
    page,

    // Repeater field detail items
    subItems: values.map((repeatState) =>
      collection.fields.map((field) => ItemField(page, repeatState, field))
    )
  }
}

/**
 * Creates a form field detail item
 * @see {@link DetailItemField}
 */
function ItemField(
  page: PageControllerClass,
  state: FormState,
  field: Field
): DetailItemField {
  return {
    name: field.name,
    label: field.title,
    title: field.title,
    value: getAnswer(field, state),
    state,
    page,
    field
  }
}
