import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import { type FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import { type DetailItem } from '@defra/forms-engine-plugin/engine/models/types.js'
import { getFormatter } from '@defra/forms-engine-plugin/engine/outputFormatters/index.js'
import {
  type FormAdapterSubmissionMessagePayload,
  type FormContext
} from '@defra/forms-engine-plugin/engine/types.js'
import {
  type FormRequestPayload,
  type OutputService as IOutputService
} from '@defra/forms-engine-plugin/types'
import {
  isFeedbackForm,
  type FormMetadata,
  type SubmitResponsePayload
} from '@defra/forms-model'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { publishFormAdapterEvent } from '~/src/server/messaging/formAdapterEventPublisher.js'

const logger = createLogger()

/**
 * Output service for handling form submission notifications
 */
export class OutputService implements IOutputService {
  /**
   * Submit form data and publish notification event
   * @param context - Form context from engine
   * @param request - Form request payload
   * @param model - Form model
   * @param _emailAddress - email address for submission to be sent to (not used)
   * @param items - Detail items from submission
   * @param submitResponse - Response from forms-submission-api
   * @param formMetadata - Form metadata (optional)
   */
  async submit(
    context: FormContext,
    request: FormRequestPayload,
    model: FormModel,
    _emailAddress: string,
    items: DetailItem[],
    submitResponse: SubmitResponsePayload,
    formMetadata?: FormMetadata
  ): Promise<void> {
    const submissionRef = context.referenceNumber

    logger.info(
      `Processing form submission output - ref: ${submissionRef}, form: ${model.name}, id: ${formMetadata?.id}`
    )

    if (isFeedbackForm(model.def)) {
      // Dont send submission email if a feedback form
      return
    }

    try {
      const formStatus = checkFormStatus(request.params)

      const formatter = getFormatter('adapter', '1')
      const submissionPayloadString = formatter(
        context,
        items,
        model,
        submitResponse,
        formStatus,
        formMetadata
      )

      const submissionPayload: FormAdapterSubmissionMessagePayload = JSON.parse(
        submissionPayloadString
      ) as FormAdapterSubmissionMessagePayload

      const formId = submissionPayload.meta.formId
      const payloadRef = submissionPayload.meta.referenceNumber
      const notificationEmail = submissionPayload.meta.notificationEmail

      if (!notificationEmail) {
        logger.info(
          `Skipping form submission notification - no notification email configured - ref: ${payloadRef}, formId: ${formId}`
        )
        return
      }

      if (request.payload?.userConfirmationEmailAddress) {
        submissionPayload.meta.custom = {
          userConfirmationEmail: request.payload?.userConfirmationEmailAddress
        }
      }

      const messageId = await publishFormAdapterEvent(submissionPayload)
      logger.info(
        `Form submission notification published - ref: ${payloadRef}, formId: ${formId}, email: ${notificationEmail}, messageId: ${messageId}`
      )
    } catch (err) {
      logger.error(
        err,
        `Failed to publish form submission notification - ref: ${submissionRef}, form: ${model.name}, id: ${formMetadata?.id}`
      )

      throw err
    }
  }
}

/**
 * Create and return output service instance
 */
export function createOutputService(): OutputService {
  return new OutputService()
}
