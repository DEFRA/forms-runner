import {
  type SubmitPayload,
  type SubmitResponsePayload
} from '@defra/forms-model'
import { badRequest, type Boom } from '@hapi/boom'
import {
  type ResponseObject,
  type ResponseToolkit,
  type RouteOptions
} from '@hapi/hapi'
import { addDays, format } from 'date-fns'

import { config } from '~/src/config/index.js'
import { FileUploadField } from '~/src/server/plugins/engine/components/FileUploadField.js'
import { getAnswer } from '~/src/server/plugins/engine/components/helpers.js'
import {
  checkEmailAddressForLiveFormSubmission,
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
        const { path: parts } = errorToFix
        const section = parts[0]
        const property = parts.length > 1 ? parts[parts.length - 1] : null
        const pageWithError = model.pages.find((page) => {
          if (page.section && page.section.name === section) {
            let propertyMatches = true
            let conditionMatches = true
            if (property) {
              propertyMatches =
                page.collection.fields.filter(
                  (component) => component.name === property
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

      viewModel.notificationEmailWarning =
        await this.buildMissingEmailWarningModel(request)

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
      const { isPreview } = checkFormStatus(request.path)
      const emailAddress = notificationEmail ?? this.model.def.outputEmail

      checkEmailAddressForLiveFormSubmission(emailAddress, isPreview)

      // Send submission email
      if (emailAddress) {
        await submitForm(request, summaryViewModel, model, state, emailAddress)
      }

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
    const fileUploadComponents = page.collection.fields.filter(
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
  const payload: SubmitPayload = {
    sessionId,
    retrievalKey,

    // Main form answers
    main: items
      .filter((item) => 'field' in item)
      .map((item) => ({
        name: item.name,
        title: item.label,
        value: item.value
      })),

    // Repeater form answers
    repeaters: items
      .filter((item) => 'subItems' in item)
      .map((item) => ({
        name: item.name,
        title: item.label,

        // Repeater item values
        value: item.subItems.map((detailItems) =>
          detailItems.map((subItem) => ({
            name: subItem.name,
            title: subItem.label,
            value: subItem.value
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

  // Get questions
  const items = getQuestions(summaryViewModel, model)

  // Submit data
  request.logger.info(logTags, 'Submitting data')
  const submitResponse = await submitData(items, emailAddress, request.yar.id)

  if (submitResponse === undefined) {
    throw badRequest('Unexpected empty response from submit api')
  }

  // Get submission email personalisation
  request.logger.info(logTags, 'Getting personalisation data')

  const personalisation = getPersonalisation(
    items,
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
  items: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>
) {
  const { files } = submitResponse.result

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
    `^ For security reasons, the links in this email expire at ${formattedExpiryDate}\n\n`
  )

  if (formStatus.isPreview) {
    lines.push(
      `This is a test of the ${model.name} ${formStatus.state} form.\n\n`
    )
  }

  lines.push(`Form received at ${formattedNow}.\n\n`)

  items.forEach((item) => {
    lines.push(`## ${item.label}`)

    if ('subItems' in item) {
      lines.push(
        `[Download ${item.label} (CSV)](${designerUrl}/file-download/${files.repeaters[item.name]})\n`
      )
    } else {
      lines.push(
        getAnswer(item.field, item.state, {
          format: 'markdown'
        })
      )
    }

    lines.push('\n')
  })

  lines.push(
    `[Download main form (CSV)](${designerUrl}/file-download/${files.main})\n`
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
    const fields = details.flatMap((detail) =>
      detail.items.filter((item) => item.page.path === page.path)
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
