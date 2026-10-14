import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { getTraceId } from '@defra/hapi-tracing'
import { mockClient } from 'aws-sdk-client-mock'

import { config } from '~/src/config/index.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import 'aws-sdk-client-mock-jest'
import { buildSaveAndExitMessage } from '~/src/server/messaging/__stubs__/builder.js'
import { publishEvent } from '~/src/server/messaging/publish-base.js'

jest.mock('~/src/server/common/helpers/logging/logger.ts', () => ({
  logger: { info: jest.fn(), error: jest.fn() }
}))
jest.mock('@defra/hapi-tracing', () => ({
  getTraceId: jest.fn()
}))

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
        Message: JSON.stringify(message),
        MessageAttributes: {
          messageType: { DataType: 'String', StringValue: message.type }
        }
      })
    })

    it('sends the trace id of the request, so the consumer logs join the same trace', async () => {
      config.set('snsSaveTopicArn', snsSaveTopicArn)
      jest.mocked(getTraceId).mockReturnValue('trace-xyz')
      snsMock.on(PublishCommand).resolves({ MessageId: 'm-1' })

      await publishEvent(message)

      expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
        MessageAttributes: {
          messageType: { DataType: 'String', StringValue: message.type },
          traceId: { DataType: 'String', StringValue: 'trace-xyz' }
        }
      })
    })

    it('logs the total time of the publish in nanoseconds (ECS event.duration)', async () => {
      config.set('snsSaveTopicArn', snsSaveTopicArn)
      snsMock.on(PublishCommand).resolves({ MessageId: 'm-1' })

      await publishEvent(message)

      const [fields] = /** @type {[{ event: { duration: number } }]} */ (
        jest.mocked(logger.info).mock.calls[0]
      )
      expect(fields.event).toMatchObject({
        category: 'save-and-exit',
        action: 'publish',
        outcome: 'success'
      })
      expect(Number.isInteger(fields.event.duration)).toBe(true)
      expect(fields.event.duration).toBeGreaterThan(0)
    })

    it('rethrows a failed publish', async () => {
      config.set('snsSaveTopicArn', snsSaveTopicArn)
      snsMock.on(PublishCommand).rejects(new Error('SNS down'))

      await expect(publishEvent(message)).rejects.toThrow('SNS down')
    })
  })
})
