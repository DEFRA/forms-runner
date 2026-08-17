import { MAGIC_LINK_GROUP_ID } from '@defra/forms-engine-plugin'
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

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { publishFormAdapterEvent } from '~/src/server/messaging/formAdapterEventPublisher.js'
import { getFormMetadataById } from '~/src/server/services/formsService.js'

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

    try {
      const formStatus = checkFormStatus(request.params)

      // Adapter v2 carries the resolved notification targets, with any output
      // conditions already evaluated against the answers as they stood at
      // submission. Every consumer of this topic has to understand the V2
      // schema version before this is bumped again.
      const formatter = getFormatter('adapter', '2')
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

      if (isFeedbackForm(model.def) && submissionPayload.data.main.formId) {
        // Override notification email to that of the related form (not the feedback form)
        const relatedFormId = submissionPayload.data.main.formId as string
        const relatedMetadata = await getFormMetadataById(relatedFormId)
        if (!relatedMetadata.notificationEmail) {
          logger.info(
            `Skipping form submission notification - no notification email configured - ref: ${payloadRef}, formId: ${relatedFormId}`
          )
          return
        }
        // The engine resolved the notification targets against this form's own
        // notification email, so they have to follow the override too. Left
        // alone, the message would name one address in `meta` and a different
        // one in the list the recipients are actually taken from.
        redirectNotificationTargets(
          submissionPayload,
          submissionPayload.meta.notificationEmail,
          relatedMetadata.notificationEmail
        )

        submissionPayload.meta.notificationEmail =
          relatedMetadata.notificationEmail
      }

      const notificationEmail = submissionPayload.meta.notificationEmail

      if (!notificationEmail) {
        logger.info(
          `Skipping form submission notification - no notification email configured - ref: ${payloadRef}, formId: ${formId}`
        )
        return
      }

      const customMeta = {} as {
        userConfirmationEmail?: string
        magicLinkGroupId?: string
      }

      // Add user confirmation email if supplied
      const userConfirmationEmailAddress =
        context.state.userConfirmationEmailAddress
      if (typeof userConfirmationEmailAddress === 'string') {
        customMeta.userConfirmationEmail = userConfirmationEmailAddress
      }

      // Add magic link group id if user resumed the form with a save-and-exit magic link
      const magicLinkGroupId = context.state[MAGIC_LINK_GROUP_ID]
      if (magicLinkGroupId && typeof magicLinkGroupId === 'string') {
        customMeta.magicLinkGroupId = magicLinkGroupId
      }

      if (Object.keys(customMeta).length > 0) {
        submissionPayload.meta.custom = customMeta
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
 * Repoints every notification target at `from` to `to`, keeping each target's
 * audience and version.
 *
 * Only targets that match are touched: an output configured against a different
 * address is a deliberate choice on the form, not something the feedback
 * override should redirect. Nothing is added when no target matches, as the
 * address the engine resolved is the one it decided should receive this
 * submission.
 * @param payload - mutated in place
 * @param from - address to replace, absent if the form has no notification email
 * @param to - address to replace it with
 */
function redirectNotificationTargets(
  payload: FormAdapterSubmissionMessagePayload,
  from: string | undefined,
  to: string
): void {
  if (!from) {
    return
  }

  for (const target of payload.notificationTargets ?? []) {
    if (target.emailAddress.toLowerCase() === from.toLowerCase()) {
      target.emailAddress = to
    }
  }
}

/**
 * Create and return output service instance
 */
export function createOutputService(): OutputService {
  return new OutputService()
}
