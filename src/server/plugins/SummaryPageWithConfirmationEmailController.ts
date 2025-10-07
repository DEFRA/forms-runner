import { type PageController } from '@defra/forms-engine-plugin/controllers/PageController.js'
import { type QuestionPageController } from '@defra/forms-engine-plugin/controllers/QuestionPageController.js'
import { SummaryPageController } from '@defra/forms-engine-plugin/controllers/SummaryPageController.js'
import { type SummaryViewModel } from '@defra/forms-engine-plugin/engine/models/SummaryViewModel.js'
import {
  type FormContext,
  type FormContextRequest,
  type FormPayload,
  type FormSubmissionError
} from '@defra/forms-engine-plugin/engine/types.js'
import { actionSchema, crumbSchema } from '@defra/forms-engine-plugin/schema.js'
import {
  FormAction,
  type FormRequestPayload,
  type FormResponseToolkit
} from '@defra/forms-engine-plugin/types'
import { type GovukField } from '@defra/forms-model'
import Joi from 'joi'

export const CONFIRMATION_EMAIL_FIELD_NAME = 'userConfirmationEmailAddress'

const schema = Joi.object().keys({
  crumb: crumbSchema,
  action: actionSchema,
  userConfirmationEmailAddress: Joi.string().email().allow('').messages({
    '*': 'Enter an email address in the correct format'
  })
})

export class SummaryPageWithConfirmationEmailController extends SummaryPageController {
  getSummaryViewModel(
    request: FormContextRequest,
    context: FormContext
  ): SummaryViewModel {
    const viewModel = super.getSummaryViewModel(request, context)
    viewModel.userConfirmationEmailField = getUserConfirmationEmailAddress(
      request.payload,
      context.errors
    )
    return viewModel
  }

  /**
   * Returns an async function. This is called in plugin.ts when there is a POST request at `/{id}/{path*}`.
   * If a form is incomplete, a user will be redirected to the start page.
   */
  makePostRouteHandler() {
    return async (
      request: FormRequestPayload,
      context: FormContext,
      h: FormResponseToolkit
    ) => {
      const viewName = (this as unknown as PageController).viewName
      const { isForceAccess } = context

      // Check if this is a save-and-exit action
      const { action } = request.payload
      if (action === FormAction.SaveAndExit) {
        return (this as unknown as QuestionPageController).handleSaveAndExit(
          request,
          context,
          h
        )
      }

      /**
       * If there are any errors, render the page with the parsed errors
       * @todo Refactor to match POST REDIRECT GET pattern
       */
      const { error } = schema.validate(request.payload, { abortEarly: false })
      if (error || isForceAccess) {
        context.errors = (this as unknown as QuestionPageController).getErrors(
          error?.details
        )
        const viewModel = this.getSummaryViewModel(request, context)
        return h.view(viewName, viewModel)
      }

      return (this as unknown as SummaryPageController).handleFormSubmit(
        request,
        context,
        h
      )
    }
  }
}

export function getUserConfirmationEmailAddress(
  payload?: FormPayload,
  errors?: FormSubmissionError[]
) {
  return {
    label: {
      text: 'Confirmation email (optional)',
      classes: 'govuk-label--m'
    },
    id: CONFIRMATION_EMAIL_FIELD_NAME,
    name: CONFIRMATION_EMAIL_FIELD_NAME,
    hint: {
      text: 'Enter your email address to get an email confirming your form has been submitted'
    },
    value: payload ? payload[CONFIRMATION_EMAIL_FIELD_NAME] : undefined,
    errorMessage: errors?.length ? errors[0].text : undefined
  } as GovukField
}
