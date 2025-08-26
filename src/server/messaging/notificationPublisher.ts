import { PublishCommand } from '@aws-sdk/client-sns'
import { type FormAdapterSubmissionMessagePayload } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getSNSClient } from '~/src/server/messaging/sns.js'

const logger = createLogger()
const snsTopicArn = config.get('snsTopicArn')

/**
 * Publish notification event directly to SNS topic
 * @param submissionPayload - Form submission payload from engine
 * @returns Promise<string> - Message ID
 */
export async function publishNotificationEvent(
  submissionPayload: FormAdapterSubmissionMessagePayload
): Promise<string> {
  if (!snsTopicArn) {
    throw new Error('SNS topic ARN is not configured')
  }

  const snsClient = getSNSClient()
  const result = await snsClient.send(
    new PublishCommand({
      TopicArn: snsTopicArn,
      Message: JSON.stringify(submissionPayload),
      Subject: `Form submission: ${submissionPayload.meta.formName ?? submissionPayload.meta.formId}`
    })
  )

  if (!result.MessageId) {
    throw new Error(
      'Failed to publish notification event - no message ID returned'
    )
  }

  logger.info(
    `Published notification event for submission ${submissionPayload.meta.referenceNumber}. MessageId: ${result.MessageId}`
  )

  return result.MessageId
}
