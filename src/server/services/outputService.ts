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
import { type Request } from '@hapi/hapi'

import { CITIZEN_SESSION } from '~/src/server/auth/scheme.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import {
  SESSION_ACTION,
  SESSION_ACTION_REFERENCE_NUMBER
} from '~/src/server/constants.js'
import { publishFormAdapterEvent } from '~/src/server/messaging/formAdapterEventPublisher.js'
import { getFormMetadataById } from '~/src/server/services/formsService.js'
import { formRequiresAuthentication } from '~/src/server/utils/utils.js'

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
        actionName?: string
        actionReferenceNumber?: string
        x?: { y: string; z: string }
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

      const auth = (request as unknown as Request).auth
      const isCitizenAuth =
        auth.isAuthenticated && auth.strategy === CITIZEN_SESSION

      if (isCitizenAuth) {
        const credentials = auth.credentials

        submissionPayload.meta.auth = {
          sub: credentials.sub,
          issuer: credentials.iss
        }

        // Check the form requires authentication (i.e. allowCopy is true)
        const requiresAuth = formRequiresAuthentication(model.def)

        if (requiresAuth) {
          // Add action details if an action was performed to the form
          const actionName = context.state[SESSION_ACTION]
          const actionReferenceNumber =
            context.state[SESSION_ACTION_REFERENCE_NUMBER]

          if (
            actionName &&
            typeof actionName === 'string' &&
            actionReferenceNumber &&
            typeof actionReferenceNumber === 'string'
          ) {
            customMeta.actionName = actionName
            customMeta.actionReferenceNumber = actionReferenceNumber
          }
        }
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
 * Create and return output service instance
 */
export function createOutputService(): OutputService {
  return new OutputService()
}
