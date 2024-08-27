import { ComponentType } from '@defra/forms-model'
import { internal, type Boom } from '@hapi/boom'
import {
  type Request,
  type ResponseObject,
  type ResponseToolkit,
  type RouteOptions
} from '@hapi/hapi'
import { format, addDays } from 'date-fns'

import { config } from '~/src/config/index.js'
import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  FeedbackContextInfo,
  RelativeUrl
} from '~/src/server/plugins/engine/feedback/index.js'
import {
  feedbackReturnInfoKey,
  redirectTo,
  redirectUrl
} from '~/src/server/plugins/engine/helpers.js'
import {
  type FormModel,
  SummaryViewModel
} from '~/src/server/plugins/engine/models/index.js'
import {
  type Detail,
  type DetailItem
} from '~/src/server/plugins/engine/models/types.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { persistFiles } from '~/src/server/plugins/engine/services/formSubmissionService.js'
import {
  type FileState,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import { type Field } from '~/src/server/schemas/types.js'
import { sendNotification } from '~/src/server/utils/notify.js'

const designerUrl = config.get('designerUrl')
const templateId = config.get('notifyTemplateId')

export class SummaryPageController extends PageController {
  /**
   * The controller which is used when Page["controller"] is defined as "./pages/summary.js"
   */

  /**
   * Returns an async function. This is called in plugin.ts when there is a GET request at `/{id}/{path*}`,
   */
  makeGetRouteHandler(): (
    request: Request,
    h: ResponseToolkit
  ) => Promise<ResponseObject | Boom> {
    return async (request, h) => {
      const { cacheService } = request.services([])
      const model = this.model

      if (this.model.def.skipSummary) {
        return this.makePostRouteHandler()(request, h)
      }
      const state = await cacheService.getState(request)
      const viewModel = new SummaryViewModel(this.title, model, state, request)

      if (viewModel.endPage) {
        return redirectTo(
          request,
          h,
          `/${model.basePath}${viewModel.endPage.path}`
        )
      }

      /**
       * iterates through the errors. If there are errors, a user will be redirected to the page
       * with the error with returnUrl=`/${model.basePath}/summary` in the URL query parameter.
       */
      if (viewModel.errors) {
        const errorToFix = viewModel.errors[0]
        const { path } = errorToFix
        const parts = path.split('.')
        const section = parts[0]
        const property = parts.length > 1 ? parts[parts.length - 1] : null
        const pageWithError = model.pages.find((page) => {
          if (page.section && page.section.name === section) {
            let propertyMatches = true
            let conditionMatches = true
            if (property) {
              propertyMatches =
                page.components.formItems.filter(
                  (item) => item.name === property
                ).length > 0
            }
            if (
              propertyMatches &&
              page.condition &&
              model.conditions[page.condition]
            ) {
              conditionMatches =
                model.conditions[page.condition]?.fn(state) ?? false
            }
            return propertyMatches && conditionMatches
          }
          return false
        })
        if (pageWithError) {
          const params = {
            returnUrl: redirectUrl(request, `/${model.basePath}/summary`)
          }
          return redirectTo(
            request,
            h,
            `/${model.basePath}${pageWithError.path}`,
            params
          )
        }
      }

      const progress = state.progress ?? []

      await this.updateProgress(progress, request, cacheService)

      viewModel.backLink = this.getBackLink(progress)

      return h.view('summary', viewModel)
    }
  }

  /**
   * Returns an async function. This is called in plugin.ts when there is a POST request at `/{id}/{path*}`.
   * If a form is incomplete, a user will be redirected to the start page.
   */
  makePostRouteHandler(): (
    request: Request,
    h: ResponseToolkit
  ) => Promise<ResponseObject | Boom> {
    return async (request, h) => {
      const { cacheService } = request.services([])
      const model = this.model
      const state = await cacheService.getState(request)
      const summaryViewModel = new SummaryViewModel(
        this.title,
        model,
        state,
        request
      )
      // TODO fix in follow-up PR
      // this.setFeedbackDetails(summaryViewModel, request)

      // Display error summary on the summary
      // page if there are incomplete form errors
      if (summaryViewModel.result.error) {
        summaryViewModel.showErrorSummary = true

        return h.view('summary', summaryViewModel)
      }

      const path = request.path
      const isPreview = path.toLowerCase().startsWith(PREVIEW_PATH_PREFIX)

      // If not in preview mode, then send the submission email
      if (!isPreview) {
        const emailAddress = this.model.def.outputEmail

        if (!emailAddress) {
          return internal(
            'An `outputEmail` is required on the form definition to complete the form submission'
          )
        }

        // Send submission email
        await submitForm(request, summaryViewModel, model, state, emailAddress)
      }

      await cacheService.setConfirmationState(request, { confirmed: true })

      // Clear all form data
      await cacheService.clearState(request)

      return redirectTo(request, h, `/${model.basePath}/status`)
    }
  }

  setFeedbackDetails(viewModel: SummaryViewModel, request: Request) {
    const feedbackContextInfo = this.getFeedbackContextInfo(request)

    if (feedbackContextInfo) {
      // set the form name to the source form name if this is a feedback form
      viewModel.name = feedbackContextInfo.formTitle
    }

    // setting the feedbackLink to undefined here for feedback forms prevents the feedback link from being shown
    viewModel.feedbackLink = this.feedbackUrlFromRequest(request)
  }

  getFeedbackContextInfo(request: Request) {
    if (this.model.def.feedback?.feedbackForm) {
      if (request.url.searchParams.get(feedbackReturnInfoKey)) {
        return decodeFeedbackContextInfo(
          request.url.searchParams.get(feedbackReturnInfoKey)
        )
      }
    }
  }

  feedbackUrlFromRequest(request: Request) {
    if (this.model.def.feedback?.url) {
      const feedbackLink = new RelativeUrl(this.model.def.feedback.url)
      const returnInfo = new FeedbackContextInfo(
        this.model.name,
        'Summary',
        `${request.url.pathname}${request.url.search}`
      )
      feedbackLink.setParam(feedbackReturnInfoKey, returnInfo.toString())
      return feedbackLink.toString()
    }

    return undefined
  }

  get postRouteOptions(): RouteOptions {
    return {
      ext: {
        onPreHandler: {
          method(request, h) {
            return h.continue
          }
        }
      }
    }
  }
}

async function submitForm(
  request: Request,
  summaryViewModel: SummaryViewModel,
  model: FormModel,
  state: FormSubmissionState,
  emailAddress: string
) {
  await extendFileRetention(model, state, emailAddress)
  await sendEmail(request, summaryViewModel, model, emailAddress)
}

async function extendFileRetention(
  model: FormModel,
  state: FormSubmissionState,
  updatedRetrievalKey: string
) {
  const files: { fileId: string; initiatedRetrievalKey: string }[] = []

  // For each file upload component with files in
  // state, add the files to the batch getting persisted
  model.pages.forEach((page) => {
    const pageState = page.section ? state[page.section.name] : state

    page.components.formItems.forEach((item) => {
      if (item.type === ComponentType.FileUploadField) {
        const componentState = pageState?.[item.name]

        if (Array.isArray(componentState)) {
          files.push(
            ...componentState.map((fileState: FileState) => {
              const { fileId } = fileState.status.form.file
              const { retrievalKey } = fileState.status.metadata

              return { fileId, initiatedRetrievalKey: retrievalKey }
            })
          )
        }
      }
    })
  })

  if (files.length) {
    return persistFiles(files, updatedRetrievalKey)
  }
}

async function sendEmail(
  request: Request,
  summaryViewModel: SummaryViewModel,
  model: FormModel,
  emailAddress: string
) {
  request.logger.info(['submit', 'email'], 'Preparing email')

  // Get submission email personalisation
  const personalisation = getPersonalisation(summaryViewModel, model)

  request.logger.info(['submit', 'email'], 'Sending email')

  try {
    // Send submission email
    await sendNotification({
      templateId,
      emailAddress,
      personalisation
    })

    request.logger.info(['submit', 'email'], 'Email sent successfully')
  } catch (err) {
    request.logger.error(['submit', 'email'], 'Error sending email', err)

    throw err
  }
}

export function getPersonalisation(
  summaryViewModel: SummaryViewModel,
  model: FormModel
) {
  /**
   * @todo Refactor this below but the code to
   * generate the question and answers works for now
   */
  const { relevantPages, details } = summaryViewModel

  const now = new Date()
  const fileExpiryDate = addDays(now, 30)
  const formattedExpiryDate = `${format(fileExpiryDate, 'h:mmaaa')} on ${format(fileExpiryDate, 'eeee d MMMM yyyy')}`
  const formSubmissionData = getFormSubmissionData(
    relevantPages,
    details,
    model
  )

  const lines: string[] = []
  const files = formSubmissionData.questions.flatMap((question) =>
    question.fields.filter((field) => field.type === 'file')
  )

  if (files.length) {
    lines.push(
      `^ For security reasons, the links in this email expire at ${formattedExpiryDate}\n`
    )
  }

  lines.push(
    `Form received at ${format(now, 'h:mmaaa')} on ${format(now, 'd MMMM yyyy')}.`
  )

  formSubmissionData.questions.forEach((question) => {
    question.fields.forEach((field) => {
      const { title, answer, type } = field
      let value = ''

      if (typeof answer === 'string') {
        value = answer
      } else if (typeof answer === 'number') {
        value = answer.toString()
      } else if (typeof answer === 'boolean') {
        value = answer ? 'yes' : 'no'
      } else if (Array.isArray(answer)) {
        const uploads = answer

        if (type === 'file') {
          const files = uploads.map((upload) => upload.status.form.file)
          const bullets = files
            .map(
              (file) =>
                `* [${file.filename}](${designerUrl}/file-download/${file.fileId})`
            )
            .join('\n')
          value = `${files.length} files uploaded (links expire ${formattedExpiryDate}):\n\n${bullets}`
        } else {
          value = answer.toString()
        }
      }

      lines.push(`## ${title}`)
      lines.push(value)
      lines.push('\n')
    })
  })

  return {
    formResults: lines.join('\n'),
    formName: model.name
  }
}

function getFormSubmissionData(
  relevantPages: PageControllerClass[],
  details: Detail[],
  model: FormModel
) {
  const questions = relevantPages.map((page) => {
    const itemsForPage = details.flatMap((detail) =>
      detail.items.filter((item) => item.path === page.path)
    )

    const fields = itemsForPage.flatMap((item) => {
      return [detailItemToField(item)]
    })

    return {
      category: page.section?.name,
      question: page.title,
      fields
    }
  })

  return {
    metadata: model.def.metadata,
    name: model.name,
    questions
  }
}

export function answerFromDetailItem(item: DetailItem) {
  switch (item.dataType) {
    case 'list':
    case 'file':
      return item.rawValue
    case 'date':
      return format(new Date(item.rawValue), 'yyyy-MM-dd')
    case 'monthYear':
      // eslint-disable-next-line no-case-declarations
      const [month, year] = Object.values(item.rawValue)
      return format(new Date(`${year}-${month}-1`), 'yyyy-MM')
    default:
      return item.value
  }
}

function detailItemToField(item: DetailItem): Field {
  return {
    key: item.name,
    title: item.title,
    type: item.dataType,
    answer: answerFromDetailItem(item)
  }
}
