import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import { type FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import { type DetailItem } from '@defra/forms-engine-plugin/engine/models/types.js'
import { getFormatter } from '@defra/forms-engine-plugin/engine/outputFormatters/index.js'
import {
  type FormAdapterSubmissionMessagePayload,
  type FormContext
} from '@defra/forms-engine-plugin/engine/types.js'
import { type OutputService as IOutputService } from '@defra/forms-engine-plugin/types'
import {
  type FormMetadata,
  type SubmitResponsePayload
} from '@defra/forms-model'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { publishFormAdapterEvent } from '~/src/server/messaging/formAdapterEventPublisher.js'
import { type FormRequestPayload } from '~/src/server/routes/types.js'

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
   * @param _emailAddress - Email address (ignored)
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

      const messageId = await publishFormAdapterEvent(submissionPayload)

      logger.info(
        `Form submission notification published - ref: ${payloadRef}, formId: ${formId}, messageId: ${messageId}`
      )
    } catch (error) {
      logger.error(
        error,
        `Failed to publish form submission notification - ref: ${submissionRef}, form: ${model.name}, id: ${formMetadata?.id}`
      )

      throw error
    }
  }
}

/**
 * Create and return output service instance
 */
export function createOutputService(): OutputService {
  return new OutputService()
}
