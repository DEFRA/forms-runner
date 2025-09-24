import { PublishCommand } from '@aws-sdk/client-sns'
import { formAdapterSubmissionMessagePayloadSchema } from '@defra/forms-engine-plugin/engine/types/schema.js'
import { type FormAdapterSubmissionMessagePayload } from '@defra/forms-engine-plugin/engine/types.js'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getSNSClient } from '~/src/server/messaging/sns.js'

const logger = createLogger()
const snsAdapterTopicArn = config.get('snsAdapterTopicArn')

/**
 * Validate form adapter submission payload against schema
 * @param submissionPayload - Form submission payload to validate
 * @returns Validated payload
 * @throws Error if validation fails
 */
function validateFormAdapterPayload(
  submissionPayload: FormAdapterSubmissionMessagePayload
): FormAdapterSubmissionMessagePayload {
  const result = formAdapterSubmissionMessagePayloadSchema.validate(
    submissionPayload,
    {
      abortEarly: false,
      allowUnknown: false
    }
  )

  if (result.error) {
    const errorDetails = result.error.details
      .map((detail) => detail.message)
      .join('; ')

    logger.error(
      result.error,
      `Form adapter payload validation failed: ${errorDetails}`
    )

    throw new Error(`Invalid form adapter payload: ${errorDetails}`)
  }

  return result.value
}

/**
 * Publish form adapter event directly to SNS topic
 * @param submissionPayload - Form submission payload from engine
 * @returns Promise<string> - Message ID
 */
export async function publishFormAdapterEvent(
  submissionPayload: FormAdapterSubmissionMessagePayload
): Promise<string> {
  if (!snsAdapterTopicArn) {
    throw new Error('SNS topic ARN is not configured')
  }

  const validatedPayload = validateFormAdapterPayload(submissionPayload)

  const snsClient = getSNSClient()
  const result = await snsClient.send(
    new PublishCommand({
      TopicArn: snsAdapterTopicArn,
      Message: JSON.stringify(validatedPayload)
    })
  )

  if (!result.MessageId) {
    throw new Error(
      'Failed to publish form adapter event - no message ID returned'
    )
  }

  logger.info(
    `Published form adapter event for submission ${validatedPayload.meta.referenceNumber}. MessageId: ${result.MessageId}`
  )

  return result.MessageId
}
