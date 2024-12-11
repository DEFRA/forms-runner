import { type Page } from '@defra/forms-model'

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
  type FormContext,
  type FormState,
  type FormSubmissionError,
  type FormSubmissionState,
  type SummaryListRow
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
  details: Detail[]
  checkAnswers: CheckAnswers[]
  context: FormContext
  name: string | undefined
  backLink?: string
  feedbackLink?: string
  phaseTag?: string
  errors?: FormSubmissionError[]
  serviceUrl: string
  notificationEmailWarning?: {
    slug: string
    designerUrl: string
  }

  constructor(
    model: FormModel,
    pageDef: Page,
    state: FormSubmissionState,
    request: FormRequest | FormRequestPayload
  ) {
    const { basePath, def } = model

    this.pageTitle = pageDef.title
    this.serviceUrl = `/${basePath}`
    this.name = def.name
    this.declaration = def.declaration
    this.context = model.getFormContext(state, request)

    const result = model
      .makeFilteredSchema(this.context.relevantPages)
      .validate(this.context.relevantState, { ...opts, stripUnknown: true })

    // Format errors
    this.errors = result.error?.details.map(getError)
    this.details = this.summaryDetails(request, model, state)

    // Format check answers
    this.checkAnswers = this.details.map((detail): CheckAnswers => {
      const { items, title } = detail

      const rows = items.map((item): SummaryListRow => {
        return {
          key: {
            text: item.title
          },
          value: {
            classes: 'app-prose-scope',
            html: item.value || 'Not supplied'
          },
          actions: {
            items: [
              {
                href: item.href,
                text: 'Change',
                classes: 'govuk-link--no-visited-state',
                visuallyHiddenText: item.label
              }
            ]
          }
        }
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
    const { errors, context } = this
    const { sections } = model

    const details: Detail[] = []

    ;[undefined, ...sections].forEach((section) => {
      const items: DetailItem[] = []

      const sectionPages = context.relevantPages.filter(
        (page) => page.section === section
      )

      sectionPages.forEach((page) => {
        const { collection, href } = page

        if (page instanceof RepeatPageController) {
          items.push(
            ItemRepeat(page, state, {
              href: page.getSummaryPath(request),
              errors
            })
          )
        } else {
          for (const field of collection.fields) {
            items.push(ItemField(page, state, field, { href, errors }))
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
}

/**
 * Creates a repeater detail item
 * @see {@link DetailItemField}
 */
function ItemRepeat(
  page: RepeatPageController,
  state: FormState,
  options: {
    href: string
    errors?: FormSubmissionError[]
  }
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
    href: redirectUrl(options.href, {
      returnUrl: redirectUrl(page.getSummaryPath())
    }),
    state,
    page,

    // Repeater field detail items
    subItems: values.map((repeatState) =>
      collection.fields.map((field) =>
        ItemField(page, repeatState, field, options)
      )
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
  field: Field,
  options: {
    href: string
    errors?: FormSubmissionError[]
  }
): DetailItemField {
  return {
    name: field.name,
    label: field.title,
    title: field.title,
    error: field.getError(options.errors),
    value: getAnswer(field, state),
    href: redirectUrl(options.href, {
      returnUrl: redirectUrl(page.getSummaryPath())
    }),
    state,
    page,
    field
  }
}
