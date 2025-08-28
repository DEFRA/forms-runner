import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { mockClient } from 'aws-sdk-client-mock'

import { config } from '~/src/config/index.js'
import 'aws-sdk-client-mock-jest'
import { buildSaveAndExitMessage } from '~/src/server/messaging/__stubs__/builder.js'
import { publishEvent } from '~/src/server/messaging/publish-base.js'

const snsTopicArn = 'arn:aws:sns:eu-west-2:000000000000:forms_runner_events'

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
      config.set('snsTopicArn', snsTopicArn)
      snsMock.on(PublishCommand).resolves({
        MessageId: '00000000-0000-0000-0000-000000000000'
      })

      await publishEvent(message)
      expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
        TopicArn: snsTopicArn,
        Message: JSON.stringify(message)
      })
    })
  })
})
