import {
  type SubmitPayload,
  type SubmitResponsePayload
} from '@defra/forms-model'
import { badRequest, internal, type Boom } from '@hapi/boom'
import {
  type ResponseObject,
  type ResponseToolkit,
  type RouteOptions
} from '@hapi/hapi'
import { addDays, format } from 'date-fns'

import { config } from '~/src/config/index.js'
import { FileUploadField } from '~/src/server/plugins/engine/components/FileUploadField.js'
import {
  checkFormStatus,
  redirectTo,
  redirectUrl
} from '~/src/server/plugins/engine/helpers.js'
import {
  SummaryViewModel,
  type FormModel
} from '~/src/server/plugins/engine/models/index.js'
import {
  type Detail,
  type DetailItem
} from '~/src/server/plugins/engine/models/types.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  persistFiles,
  submit
} from '~/src/server/plugins/engine/services/formSubmissionService.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'
import { sendNotification } from '~/src/server/utils/notify.js'

const designerUrl = config.get('designerUrl')
const templateId = config.get('notifyTemplateId')

export class SummaryPageController extends PageController {
  /**
   * The controller which is used when Page["controller"] is defined as "./pages/summary.js"
   */

  getSummaryViewModel(
    title: string,
    model: FormModel,
    state: FormSubmissionState,
    request: FormRequest | FormRequestPayload
  ): SummaryViewModel {
    const relevantState = this.getConditionEvaluationContext(model, state)

    const viewModel = new SummaryViewModel(
      title,
      model,
      state,
      relevantState,
      request
    )

    // We already figure these out in the base page controller. Take them and apply them to our page-specific model.
    // This is a stop-gap until we can add proper inheritance in place.
    viewModel.feedbackLink = this.getFeedbackLink()
    viewModel.phaseTag = this.getPhaseTag()

    return viewModel
  }

  /**
   * Returns an async function. This is called in plugin.ts when there is a GET request at `/{id}/{path*}`,
   */
  makeGetRouteHandler(): (
    request: FormRequest,
    h: ResponseToolkit<FormRequestRefs>
  ) => Promise<ResponseObject | Boom> {
    return async (request, h) => {
      const { cacheService } = request.services([])
      const model = this.model

      if (this.model.def.skipSummary) {
        return this.makePostRouteHandler()(request, h)
      }
      const state = await cacheService.getState(request)

      const viewModel = this.getSummaryViewModel(
        this.title,
        model,
        state,
        request
      )

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
            returnUrl: redirectUrl(`/${model.basePath}/summary`)
          }
          return redirectTo(
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
    request: FormRequestPayload,
    h: ResponseToolkit<FormRequestPayloadRefs>
  ) => Promise<ResponseObject | Boom> {
    return async (request, h) => {
      const { cacheService } = request.services([])
      const model = this.model
      const state = await cacheService.getState(request)
      const summaryViewModel = this.getSummaryViewModel(
        this.title,
        model,
        state,
        request
      )

      // Display error summary on the summary
      // page if there are incomplete form errors
      if (summaryViewModel.result.error) {
        summaryViewModel.showErrorSummary = true

        return h.view('summary', summaryViewModel)
      }

      const { params } = request

      // Get the form metadata using the `slug` param
      const { notificationEmail } = await getFormMetadata(params.slug)
      const emailAddress = notificationEmail ?? this.model.def.outputEmail

      if (!emailAddress) {
        return internal(
          'An email address is required to complete the form submission'
        )
      }

      // Send submission email
      await submitForm(request, summaryViewModel, model, state, emailAddress)

      await cacheService.setConfirmationState(request, { confirmed: true })

      // Clear all form data
      await cacheService.clearState(request)

      return redirectTo(h, `/${model.basePath}/status`)
    }
  }

  get postRouteOptions(): RouteOptions<FormRequestPayloadRefs> {
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
  request: FormRequestPayload,
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
    const fileUploadComponents = page.components.formItems.filter(
      (component) => component instanceof FileUploadField
    )

    fileUploadComponents.forEach((component) => {
      const values = component.getFormValueFromState(state)
      if (!values?.length) {
        return
      }

      files.push(
        ...values.map(({ status }) => ({
          fileId: status.form.file.fileId,
          initiatedRetrievalKey: status.metadata.retrievalKey
        }))
      )
    })
  })

  if (files.length) {
    return persistFiles(files, updatedRetrievalKey)
  }
}

function submitData(
  items: DetailItem[],
  retrievalKey: string,
  sessionId: string
) {
  const main = items.filter((item) => item.type)
  const repeaters = items.filter((item) => item.subItems)

  const payload: SubmitPayload = {
    sessionId,
    retrievalKey,
    main: main.map((item) => ({
      name: item.name,
      title: item.title,
      value: item.value
    })),
    repeaters: repeaters.map((item) => ({
      name: item.name,
      title: item.title,
      value: (item.subItems ?? []).map((detailItem) =>
        detailItem.map((item) => ({
          name: item.name,
          title: item.title,
          value: item.value
        }))
      )
    }))
  }

  return submit(payload)
}

async function sendEmail(
  request: FormRequestPayload,
  summaryViewModel: SummaryViewModel,
  model: FormModel,
  emailAddress: string
) {
  const { path } = request
  const formStatus = checkFormStatus(path)
  const logTags = ['submit', 'email']

  request.logger.info(logTags, 'Preparing email', formStatus)

  // Get questions and submit data
  const questions = getQuestions(summaryViewModel, model)

  request.logger.info(logTags, 'Submitting data')

  const submitResponse = await submitData(
    questions,
    emailAddress,
    request.yar.id
  )

  if (submitResponse === undefined) {
    throw badRequest('Unexpected empty response from submit api')
  }

  // Get submission email personalisation
  request.logger.info(logTags, 'Getting personalisation data')

  const personalisation = getPersonalisation(
    questions,
    model,
    submitResponse,
    formStatus
  )

  request.logger.info(logTags, 'Sending email')

  try {
    // Send submission email
    await sendNotification({
      templateId,
      emailAddress,
      personalisation
    })

    request.logger.info(logTags, 'Email sent successfully')
  } catch (err) {
    request.logger.error(logTags, 'Error sending email', err)

    throw err
  }
}

export function getQuestions(
  summaryViewModel: SummaryViewModel,
  model: FormModel
) {
  return getFormSubmissionData(
    summaryViewModel.relevantPages,
    summaryViewModel.details,
    model
  ).questions.flatMap(({ fields }) => fields)
}

export function getPersonalisation(
  questions: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>
) {
  /**
   * @todo Refactor this below but the code to
   * generate the question and answers works for now
   */
  const now = new Date()
  const formattedNow = `${format(now, 'h:mmaaa')} on ${format(now, 'd MMMM yyyy')}`

  const fileExpiryDate = addDays(now, 30)
  const formattedExpiryDate = `${format(fileExpiryDate, 'h:mmaaa')} on ${format(fileExpiryDate, 'eeee d MMMM yyyy')}`

  const subject = formStatus.isPreview
    ? `TEST FORM SUBMISSION: ${model.name}`
    : `Form received: ${model.name}`

  const lines: string[] = []

  lines.push(
    `^ For security reasons, the links in this email expire at ${formattedExpiryDate}\n`
  )

  if (formStatus.isPreview) {
    lines.push(`This is a test of the ${model.name} ${formStatus.state} form.`)
  }

  lines.push(`Form received at ${formattedNow}.\n`)

  questions.forEach((item) => {
    lines.push(`## ${item.title}`)
    lines.push(item.markdownValue ?? item.value)
    lines.push('\n')
  })

  lines.push(
    `[Download all](${designerUrl}/file-download/${submitResponse.result.files.main})\n`
  )

  return {
    body: lines.join('\n'),
    subject
  }
}

function getFormSubmissionData(
  relevantPages: PageControllerClass[],
  details: Detail[],
  model: FormModel
) {
  const questions = relevantPages.map((page) => {
    const fields = details.flatMap(({ items }) =>
      items.filter((item) => item.page.path === page.path)
    )

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
