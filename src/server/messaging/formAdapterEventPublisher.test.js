import { PublishCommand } from '@aws-sdk/client-sns'

import { publishFormAdapterEvent } from '~/src/server/messaging/formAdapterEventPublisher.js'
import { getSNSClient } from '~/src/server/messaging/sns.js'

/**
 * @typedef {import('@defra/forms-engine-plugin/engine/types.js').FormAdapterSubmissionMessagePayload} FormAdapterSubmissionMessagePayload
 */

/**
 * Helper function to test invalid payloads
 * @param {unknown} invalidPayload - The invalid payload to test
 * @returns {Promise<void>}
 */
async function expectValidationError(invalidPayload) {
  const typedPayload = /** @type {FormAdapterSubmissionMessagePayload} */ (
    invalidPayload
  )
  await expect(publishFormAdapterEvent(typedPayload)).rejects.toThrow(
    'Invalid form adapter payload'
  )
}

jest.mock('@aws-sdk/client-sns')
jest.mock('~/src/server/messaging/sns.ts')

/** @type {FormAdapterSubmissionMessagePayload} */
const basePayload = {
  meta: {
    schemaVersion: 1,
    timestamp: new Date(),
    formId: '507f1f77bcf86cd799439011',
    formSlug: 'test-form',
    formName: 'Test Form',
    referenceNumber: 'REF-123456',
    status: 'live',
    isPreview: false,
    notificationEmail: 'test@example.com'
  },
  data: {
    main: { field1: 'value1' },
    repeaters: {},
    files: {}
  },
  result: {
    files: {
      main: 'main-file-path',
      repeaters: {}
    }
  }
}

describe('formAdapterEventPublisher', () => {
  /** @type {FormAdapterSubmissionMessagePayload} */
  let mockPayload

  /** @type {{ send: jest.Mock }} */
  let mockSnsClient

  beforeEach(() => {
    jest.clearAllMocks()

    mockPayload = /** @type {FormAdapterSubmissionMessagePayload} */ ({
      ...basePayload,
      meta: { ...basePayload.meta }
    })

    mockSnsClient = { send: jest.fn() }
    jest
      .mocked(getSNSClient)
      .mockReturnValue(
        /** @type {import('@aws-sdk/client-sns').SNSClient} */ (
          /** @type {unknown} */ (mockSnsClient)
        )
      )
  })

  describe('publishFormAdapterEvent', () => {
    it('successfully publishes event to SNS topic', async () => {
      mockSnsClient.send.mockResolvedValue({ MessageId: 'msg-123' })

      const result = await publishFormAdapterEvent(mockPayload)

      expect(result).toBe('msg-123')
      expect(getSNSClient).toHaveBeenCalled()
      expect(PublishCommand).toHaveBeenCalledWith({
        TopicArn: 'arn:aws:sns:eu-west-2:123456789012:test-adapter-topic',
        Message: JSON.stringify(mockPayload)
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

    it('serialises entire payload as JSON message', async () => {
      mockSnsClient.send.mockResolvedValue({ MessageId: 'msg-789' })

      const complexPayload =
        /** @type {FormAdapterSubmissionMessagePayload} */ ({
          meta: {
            schemaVersion: 1,
            timestamp: new Date(),
            formId: '507f1f77bcf86cd799439012',
            formSlug: 'complex-form',
            formName: 'Complex Form',
            referenceNumber: 'COMPLEX-REF',
            status: 'live',
            isPreview: false,
            notificationEmail: 'complex@example.com'
          },
          data: {
            main: {
              nested: { inner: 'value' },
              array: [1, 2, 3]
            },
            repeaters: {},
            files: {}
          },
          result: {
            files: {
              main: 'complex-file-path',
              repeaters: {}
            }
          }
        })

      await publishFormAdapterEvent(complexPayload)

      expect(PublishCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: JSON.stringify(complexPayload)
        })
      )
    })

    describe('payload validation', () => {
      it('validates payload successfully with valid data', async () => {
        mockSnsClient.send.mockResolvedValue({ MessageId: 'msg-valid' })

        const result = await publishFormAdapterEvent(mockPayload)

        expect(result).toBe('msg-valid')
        expect(mockSnsClient.send).toHaveBeenCalled()
      })

      it('throws validation error when meta is missing', async () => {
        const invalidPayload = {
          data: mockPayload.data,
          // Intentionally omit meta property
          result: mockPayload.result
        }

        await expectValidationError(invalidPayload)
        expect(mockSnsClient.send).not.toHaveBeenCalled()
      })

      it('throws validation error when required meta fields are missing', async () => {
        const invalidPayload = {
          meta: {
            schemaVersion: 1
            // Missing required fields like timestamp, formId, etc.
          },
          data: mockPayload.data,
          result: mockPayload.result
        }

        await expectValidationError(invalidPayload)
        expect(mockSnsClient.send).not.toHaveBeenCalled()
      })

      it('throws validation error when data is missing', async () => {
        const invalidPayload = {
          meta: mockPayload.meta,
          // Intentionally omit data property
          result: mockPayload.result
        }

        await expectValidationError(invalidPayload)
        expect(mockSnsClient.send).not.toHaveBeenCalled()
      })

      it('throws validation error when result is missing', async () => {
        const invalidPayload = {
          meta: mockPayload.meta,
          data: mockPayload.data
          // Intentionally omit result property
        }

        await expectValidationError(invalidPayload)
        expect(mockSnsClient.send).not.toHaveBeenCalled()
      })

      it('throws validation error with invalid email format', async () => {
        const invalidPayload = {
          ...mockPayload,
          meta: {
            ...mockPayload.meta,
            notificationEmail: 'invalid-email'
          }
        }

        await expectValidationError(invalidPayload)
        expect(mockSnsClient.send).not.toHaveBeenCalled()
      })

      it('throws validation error with invalid status', async () => {
        const invalidPayload = {
          ...mockPayload,
          meta: {
            ...mockPayload.meta,
            status: 'invalid-status'
          }
        }

        await expectValidationError(invalidPayload)
        expect(mockSnsClient.send).not.toHaveBeenCalled()
      })

      it('throws validation error with invalid schema version', async () => {
        const invalidPayload = {
          ...mockPayload,
          meta: {
            ...mockPayload.meta,
            schemaVersion: 999
          }
        }

        await expectValidationError(invalidPayload)
        expect(mockSnsClient.send).not.toHaveBeenCalled()
      })
    })
  })
})

describe('per-form topic routing (SNS_FORM_TOPIC_ARN_MAP)', () => {
  // formId must match the entry in jest.setup.cjs SNS_FORM_TOPIC_ARN_MAP
  const formSpecificArn =
    'arn:aws:sns:eu-west-2:123456789012:form-specific-topic'
  const mappedFormId = '507f1f77bcf86cd799439099'

  /** @type {FormAdapterSubmissionMessagePayload} */
  const mappedPayload = {
    ...basePayload,
    meta: { ...basePayload.meta, formId: mappedFormId }
  }

  /** @type {any} */
  let mockSnsClient

  beforeEach(() => {
    mockSnsClient = { send: jest.fn() }
    jest.mocked(getSNSClient).mockReturnValue(mockSnsClient)
  })

  it('publishes to form-specific topic in addition to global topic when formId is mapped', async () => {
    mockSnsClient.send
      .mockResolvedValueOnce({ MessageId: 'global-msg-id' })
      .mockResolvedValueOnce({ MessageId: 'form-specific-msg-id' })

    const result = await publishFormAdapterEvent(mappedPayload)

    expect(result).toBe('global-msg-id')
    expect(mockSnsClient.send).toHaveBeenCalledTimes(2)
    expect(PublishCommand).toHaveBeenNthCalledWith(1, {
      TopicArn: 'arn:aws:sns:eu-west-2:123456789012:test-adapter-topic',
      Message: JSON.stringify(mappedPayload)
    })
    expect(PublishCommand).toHaveBeenNthCalledWith(2, {
      TopicArn: formSpecificArn,
      Message: JSON.stringify(mappedPayload)
    })
  })

  it('does not publish to form-specific topic when formId is not in the map', async () => {
    mockSnsClient.send.mockResolvedValueOnce({ MessageId: 'global-msg-id' })

    // basePayload uses formId 507f1f77bcf86cd799439011 which is not in the map
    await publishFormAdapterEvent(basePayload)

    expect(mockSnsClient.send).toHaveBeenCalledTimes(1)
  })

  it('throws when form-specific publish returns no MessageId', async () => {
    mockSnsClient.send
      .mockResolvedValueOnce({ MessageId: 'global-msg-id' })
      .mockResolvedValueOnce({})

    await expect(publishFormAdapterEvent(mappedPayload)).rejects.toThrow(
      'Failed to publish form adapter event to form-specific topic - no message ID returned'
    )
  })

  it('sends the exact same message string to both topics', async () => {
    mockSnsClient.send
      .mockResolvedValueOnce({ MessageId: 'global-msg-id' })
      .mockResolvedValueOnce({ MessageId: 'form-specific-msg-id' })

    await publishFormAdapterEvent(mappedPayload)

    const calls = jest.mocked(PublishCommand).mock.calls
    expect(calls[0][0].Message).toBe(calls[1][0].Message)
  })
})

/**
 * @import { FormAdapterSubmissionMessagePayload } from '@defra/forms-engine-plugin/engine/types.js'
 */
