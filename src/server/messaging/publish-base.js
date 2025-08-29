import { PublishCommand } from '@aws-sdk/client-sns'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getSNSClient } from '~/src/server/messaging/sns.js'

const logger = createLogger()

const snsSaveTopicArn = config.get('snsSaveTopicArn')

const client = getSNSClient()

/**
 * Publish event onto topic
 * @param {SaveAndExitMessage} message
 */
export async function publishEvent(message) {
  const command = new PublishCommand({
    TopicArn: snsSaveTopicArn,
    Message: JSON.stringify(message)
  })

  const result = await client.send(command)

  logger.info(
    `Published ${message.type} event for formId ${message.entityId}. MessageId: ${result.MessageId}`
  )

  return result
}

/**
 * @import { SaveAndExitMessage } from '@defra/forms-model'
 */
