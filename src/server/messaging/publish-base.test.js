import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { createLogContext, runWithLogContext } from '@defra/forms-common'
import { mockClient } from 'aws-sdk-client-mock'

import { config } from '~/src/config/index.js'
import 'aws-sdk-client-mock-jest'
import { buildSaveAndExitMessage } from '~/src/server/messaging/__stubs__/builder.js'
import { publishEvent } from '~/src/server/messaging/publish-base.js'

const snsSaveTopicArn = 'arn:aws:sns:eu-west-2:123456789012:test-save-topic'

describe('publish-base', () => {
  const snsMock = mockClient(SNSClient)

  afterEach(() => {
    snsMock.reset()
  })

  describe('publishEvent', () => {
    const message = buildSaveAndExitMessage()
    afterEach(() => {
      jest.resetAllMocks()
    })

    it('should publish', async () => {
      config.set('snsSaveTopicArn', snsSaveTopicArn)
      snsMock.on(PublishCommand).resolves({
        MessageId: '00000000-0000-0000-0000-000000000000'
      })

      await publishEvent(message)
      expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
        TopicArn: snsSaveTopicArn,
        Message: JSON.stringify(message)
      })
    })

    it('should publish the log context as message attributes', async () => {
      config.set('snsSaveTopicArn', snsSaveTopicArn)
      snsMock.on(PublishCommand).resolves({
        MessageId: '00000000-0000-0000-0000-000000000000'
      })

      await runWithLogContext(
        createLogContext({ correlationId: 'correlation-1', userId: 'user-1' }),
        () => publishEvent(message)
      )

      expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
        TopicArn: snsSaveTopicArn,
        Message: JSON.stringify(message),
        MessageAttributes: {
          correlationId: { DataType: 'String', StringValue: 'correlation-1' },
          userId: { DataType: 'String', StringValue: 'user-1' }
        }
      })
    })
  })
})
