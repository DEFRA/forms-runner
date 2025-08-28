import { PublishCommand } from '@aws-sdk/client-sns'

import { publishFormAdapterEvent } from '~/src/server/messaging/formAdapterEventPublisher.js'
import { getSNSClient } from '~/src/server/messaging/sns.js'

jest.mock('@aws-sdk/client-sns')
jest.mock('~/src/server/messaging/sns.ts')

describe('formAdapterEventPublisher', () => {
  /** @type {FormAdapterSubmissionMessagePayload} */
  let mockPayload

  /** @type {any} */
  let mockSnsClient

  beforeEach(() => {
    jest.clearAllMocks()

    mockPayload = /** @type {any} */ ({
      meta: {
        schemaVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        formId: 'form-123',
        formSlug: 'test-form',
        formName: 'Test Form',
        referenceNumber: 'REF-123456'
      },
      data: {
        main: [{ name: 'field1', value: 'value1' }],
        repeaters: [],
        files: []
      }
    })

    mockSnsClient = {
      send: jest.fn()
    }
    jest.mocked(getSNSClient).mockReturnValue(mockSnsClient)
  })

  describe('publishFormAdapterEvent', () => {
    it('successfully publishes event to SNS topic', async () => {
      mockSnsClient.send.mockResolvedValue({ MessageId: 'msg-123' })

      const result = await publishFormAdapterEvent(mockPayload)

      expect(result).toBe('msg-123')
      expect(getSNSClient).toHaveBeenCalled()
      expect(PublishCommand).toHaveBeenCalledWith({
        TopicArn: 'arn:aws:sns:eu-west-2:123456789012:test-topic',
        Message: JSON.stringify(mockPayload),
        Subject: 'Form submission: Test Form'
      })
      expect(mockSnsClient.send).toHaveBeenCalledWith(
        expect.any(PublishCommand)
      )
    })

    it('throws error when SNS returns no MessageId', async () => {
      mockSnsClient.send.mockResolvedValue({})

      await expect(publishFormAdapterEvent(mockPayload)).rejects.toThrow(
        'Failed to publish form adapter event - no message ID returned'
      )

      expect(getSNSClient).toHaveBeenCalled()
      expect(mockSnsClient.send).toHaveBeenCalled()
    })

    it('throws error when SNS send fails', async () => {
      const snsError = new Error('SNS service unavailable')
      mockSnsClient.send.mockRejectedValue(snsError)

      await expect(publishFormAdapterEvent(mockPayload)).rejects.toThrow(
        'SNS service unavailable'
      )

      expect(getSNSClient).toHaveBeenCalled()
      expect(mockSnsClient.send).toHaveBeenCalled()
    })

    it('uses correct subject format with form name', async () => {
      mockSnsClient.send.mockResolvedValue({ MessageId: 'msg-456' })

      const customPayload = /** @type {any} */ ({
        ...mockPayload,
        meta: {
          ...mockPayload.meta,
          formName: 'Special & Characters Form!'
        }
      })

      await publishFormAdapterEvent(customPayload)

      expect(PublishCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Subject: 'Form submission: Special & Characters Form!'
        })
      )
    })

    it('serializes entire payload as JSON message', async () => {
      mockSnsClient.send.mockResolvedValue({ MessageId: 'msg-789' })

      const complexPayload = /** @type {any} */ ({
        meta: {
          schemaVersion: '1.0.0',
          timestamp: new Date().toISOString(),
          formId: 'complex-form',
          formSlug: 'complex-form',
          formName: 'Complex Form',
          referenceNumber: 'COMPLEX-REF'
        },
        data: {
          main: [
            { name: 'nested', value: { inner: 'value' } },
            { name: 'array', value: [1, 2, 3] }
          ],
          repeaters: [],
          files: []
        }
      })

      await publishFormAdapterEvent(complexPayload)

      expect(PublishCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: JSON.stringify(complexPayload)
        })
      )
    })
  })
})

/**
 * @import { FormAdapterSubmissionMessagePayload } from '@defra/forms-engine-plugin/engine/types.js'
 */
