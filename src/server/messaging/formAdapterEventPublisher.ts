import { PublishCommand } from '@aws-sdk/client-sns'
import { type FormAdapterSubmissionMessagePayload } from '@defra/forms-engine-plugin/engine/types.js'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getSNSClient } from '~/src/server/messaging/sns.js'

const logger = createLogger()
const snsAdapterTopicArn = config.get('snsAdapterTopicArn')

/**
 * Publish form adapter event directly to SNS topic
 * @param submissionPayload - Form submission payload from engine
 * @returns Promise<string> - Message ID
 */
export async function publishFormAdapterEvent(
  submissionPayload: FormAdapterSubmissionMessagePayload
): Promise<string> {
  if (!snsAdapterTopicArn) {
    throw new Error('SNS adapter topic ARN is not configured')
  }

  const snsClient = getSNSClient()
  const result = await snsClient.send(
    new PublishCommand({
      TopicArn: snsAdapterTopicArn,
      Message: JSON.stringify(submissionPayload),
      Subject: `Form submission: ${submissionPayload.meta.formName}`
    })
  )

  if (!result.MessageId) {
    throw new Error(
      'Failed to publish form adapter event - no message ID returned'
    )
  }

  logger.info(
    `Published form adapter event for submission ${submissionPayload.meta.referenceNumber}. MessageId: ${result.MessageId}`
  )

  return result.MessageId
}
