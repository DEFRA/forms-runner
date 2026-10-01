import { PublishCommand } from '@aws-sdk/client-sns'
import { getTraceId } from '@defra/hapi-tracing'

import { config } from '~/src/config/index.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { getSNSClient } from '~/src/server/messaging/sns.js'

const snsSaveTopicArn = config.get('snsSaveTopicArn')

const client = getSNSClient()

/**
 * Message attributes for an event. The trace id lets forms-submission-api log
 * its processing of the message under the same trace as this request. The
 * attributes reach the queue because the subscription uses raw delivery.
 * @param {SaveAndExitMessage} message
 */
function messageAttributes(message) {
  const traceId = getTraceId()

  return {
    messageType: { DataType: 'String', StringValue: message.type },
    ...(traceId && { traceId: { DataType: 'String', StringValue: traceId } })
  }
}

/**
 * Publish event onto topic
 * @param {SaveAndExitMessage} message
 */
export async function publishEvent(message) {
  const command = new PublishCommand({
    TopicArn: snsSaveTopicArn,
    Message: JSON.stringify(message),
    MessageAttributes: messageAttributes(message)
  })

  // The log names the form and the message, never the person: no email
  // address, answers or security answer
  const event = {
    category: 'save-and-exit',
    action: 'publish',
    reference: message.data.form.id
  }
  const start = performance.now()

  try {
    const result = await client.send(command)
    const duration = Math.round(performance.now() - start)

    logger.info(
      { event: { ...event, outcome: 'success', duration } },
      `Published ${message.type} event for formId ${message.data.form.id}. MessageId: ${result.MessageId} (${duration}ms)`
    )

    return result
  } catch (err) {
    const duration = Math.round(performance.now() - start)

    logger.error(
      { err, event: { ...event, outcome: 'failure', duration } },
      `Failed to publish ${message.type} event for formId ${message.data.form.id} (${duration}ms)`
    )

    throw err
  }
}

/**
 * @import { SaveAndExitMessage } from '@defra/forms-model'
 */
