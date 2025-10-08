import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import { getFormatter } from '@defra/forms-engine-plugin/engine/outputFormatters/index.js'
import { FormStatus } from '@defra/forms-engine-plugin/types'

import { publishFormAdapterEvent } from '~/src/server/messaging/formAdapterEventPublisher.js'
import {
  OutputService,
  createOutputService
} from '~/src/server/services/outputService.js'

jest.mock('@defra/forms-engine-plugin/engine/helpers.js')
jest.mock('@defra/forms-engine-plugin/engine/outputFormatters/index.js')
jest.mock('~/src/server/common/helpers/logging/logger.ts', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn()
  }))
}))
jest.mock('~/src/server/messaging/formAdapterEventPublisher.ts')

describe('OutputService', () => {
  /** @type {OutputService} */
  let outputService

  /** @type {FormContext} */
  let mockContext

  /** @type {FormRequestPayload} */
  let mockRequest

  /** @type {FormModel} */
  let mockModel

  /** @type {DetailItem[]} */
  let mockItems

  /** @type {SubmitResponsePayload} */
  let mockSubmitResponse

  /** @type {FormMetadata} */
  let mockFormMetadata

  /** @type {jest.Mock} */
  let mockFormatter

  beforeEach(() => {
    jest.clearAllMocks()

    mockFormatter = jest.fn()
    jest.mocked(getFormatter).mockReturnValue(mockFormatter)

    jest.mocked(checkFormStatus).mockReturnValue({
      isPreview: false,
      state: FormStatus.Live
    })

    jest.mocked(publishFormAdapterEvent).mockResolvedValue('message-id-123')

    outputService = new OutputService()

    mockContext = /** @type {any} */ ({
      referenceNumber: 'REF-123456',
      evaluationState: {},
      relevantState: {},
      relevantPages: [],
      payload: {},
      state: {},
      errors: undefined,
      paths: [],
      isForceAccess: false,
      data: {},
      pageDefMap: new Map(),
      listDefMap: new Map(),
      componentDefMap: new Map(),
      pageMap: new Map(),
      componentMap: new Map()
    })

    mockRequest = /** @type {any} */ ({
      params: {
        formSlug: 'test-form',
        path: '/test-form',
        slug: 'test-form'
      }
    })

    mockModel = /** @type {any} */ ({
      name: 'Test Form'
    })

    mockItems = /** @type {any} */ ([
      { name: 'field1', value: 'value1' },
      { name: 'field2', value: 'value2' }
    ])

    mockSubmitResponse = /** @type {any} */ ({
      retrievalKey: 'SUB-789'
    })

    mockFormMetadata = {
      id: 'form-123',
      title: 'Test Form',
      slug: 'test-form',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      createdBy: { id: 'test-user', displayName: 'Test User' },
      updatedBy: { id: 'test-user', displayName: 'Test User' },
      teamName: 'test-team',
      teamEmail: 'test@example.com',
      organisation: 'Test Org'
    }
  })

  describe('submit', () => {
    it('successfully processes form submission and publishes event', async () => {
      const mockPayload = {
        meta: {
          formId: 'form-123',
          referenceNumber: 'REF-123456',
          formName: 'Test Form',
          notificationEmail: 'notify@example.com'
        },
        data: mockItems
      }

      mockFormatter.mockReturnValue(JSON.stringify(mockPayload))

      await outputService.submit(
        mockContext,
        mockRequest,
        mockModel,
        'test@example.com',
        mockItems,
        mockSubmitResponse,
        mockFormMetadata
      )

      expect(checkFormStatus).toHaveBeenCalledWith(mockRequest.params)
      expect(getFormatter).toHaveBeenCalledWith('adapter', '1')
      expect(mockFormatter).toHaveBeenCalledWith(
        mockContext,
        mockItems,
        mockModel,
        mockSubmitResponse,
        { isPreview: false, state: FormStatus.Live },
        mockFormMetadata
      )
      expect(publishFormAdapterEvent).toHaveBeenCalledWith(mockPayload)
    })

    it('successfully processes form submission without form metadata', async () => {
      const mockPayload = {
        meta: {
          formId: 'unknown',
          referenceNumber: 'REF-123456',
          formName: 'Test Form',
          notificationEmail: 'notify@example.com'
        },
        data: mockItems
      }

      mockFormatter.mockReturnValue(JSON.stringify(mockPayload))

      await outputService.submit(
        mockContext,
        mockRequest,
        mockModel,
        'test@example.com',
        mockItems,
        mockSubmitResponse
      )

      expect(checkFormStatus).toHaveBeenCalledWith(mockRequest.params)
      expect(getFormatter).toHaveBeenCalledWith('adapter', '1')
      expect(mockFormatter).toHaveBeenCalledWith(
        mockContext,
        mockItems,
        mockModel,
        mockSubmitResponse,
        { isPreview: false, state: FormStatus.Live },
        undefined
      )
      expect(publishFormAdapterEvent).toHaveBeenCalledWith(mockPayload)
    })

    it('handles formatter error and logs appropriately', async () => {
      const formatterError = new Error('Formatter failed')
      mockFormatter.mockImplementation(() => {
        throw formatterError
      })

      await expect(
        outputService.submit(
          mockContext,
          mockRequest,
          mockModel,
          'test@example.com',
          mockItems,
          mockSubmitResponse,
          mockFormMetadata
        )
      ).rejects.toThrow('Formatter failed')

      expect(checkFormStatus).toHaveBeenCalledWith(mockRequest.params)
      expect(getFormatter).toHaveBeenCalledWith('adapter', '1')
      expect(publishFormAdapterEvent).not.toHaveBeenCalled()
    })

    it('handles JSON parse error and logs appropriately', async () => {
      mockFormatter.mockReturnValue('invalid json {')

      await expect(
        outputService.submit(
          mockContext,
          mockRequest,
          mockModel,
          'test@example.com',
          mockItems,
          mockSubmitResponse,
          mockFormMetadata
        )
      ).rejects.toThrow(SyntaxError)

      expect(checkFormStatus).toHaveBeenCalledWith(mockRequest.params)
      expect(getFormatter).toHaveBeenCalledWith('adapter', '1')
      expect(publishFormAdapterEvent).not.toHaveBeenCalled()
    })

    it('handles publishing error and logs appropriately', async () => {
      const mockPayload = {
        meta: {
          formId: 'form-123',
          referenceNumber: 'REF-123456',
          formName: 'Test Form',
          notificationEmail: 'notify@example.com'
        },
        data: mockItems
      }

      mockFormatter.mockReturnValue(JSON.stringify(mockPayload))

      const publishError = new Error('SNS publish failed')
      jest.mocked(publishFormAdapterEvent).mockRejectedValue(publishError)

      await expect(
        outputService.submit(
          mockContext,
          mockRequest,
          mockModel,
          'test@example.com',
          mockItems,
          mockSubmitResponse,
          mockFormMetadata
        )
      ).rejects.toThrow('SNS publish failed')

      expect(checkFormStatus).toHaveBeenCalledWith(mockRequest.params)
      expect(getFormatter).toHaveBeenCalledWith('adapter', '1')
      expect(mockFormatter).toHaveBeenCalledWith(
        mockContext,
        mockItems,
        mockModel,
        mockSubmitResponse,
        { isPreview: false, state: FormStatus.Live },
        mockFormMetadata
      )
      expect(publishFormAdapterEvent).toHaveBeenCalledWith(mockPayload)
    })

    it('handles error without form metadata', async () => {
      const formatterError = new Error('Formatter failed')
      mockFormatter.mockImplementation(() => {
        throw formatterError
      })

      await expect(
        outputService.submit(
          mockContext,
          mockRequest,
          mockModel,
          'test@example.com',
          mockItems,
          mockSubmitResponse
        )
      ).rejects.toThrow('Formatter failed')

      expect(checkFormStatus).toHaveBeenCalledWith(mockRequest.params)
      expect(getFormatter).toHaveBeenCalledWith('adapter', '1')
      expect(publishFormAdapterEvent).not.toHaveBeenCalled()
    })

    it('uses correct parameters when calling formatter', async () => {
      const mockPayload = {
        meta: {
          formId: 'form-123',
          referenceNumber: 'REF-123456',
          formName: 'Test Form'
        },
        data: mockItems
      }

      jest.mocked(checkFormStatus).mockReturnValue({
        isPreview: false,
        state: FormStatus.Draft
      })
      mockFormatter.mockReturnValue(JSON.stringify(mockPayload))

      await outputService.submit(
        mockContext,
        mockRequest,
        mockModel,
        'test@example.com',
        mockItems,
        mockSubmitResponse,
        mockFormMetadata
      )

      expect(mockFormatter).toHaveBeenCalledWith(
        mockContext,
        mockItems,
        mockModel,
        mockSubmitResponse,
        { isPreview: false, state: FormStatus.Draft },
        mockFormMetadata
      )
    })

    it('email address parameter is ignored', async () => {
      const mockPayload = {
        meta: {
          formId: 'form-123',
          referenceNumber: 'REF-123456',
          formName: 'Test Form'
        },
        data: mockItems
      }

      mockFormatter.mockReturnValue(JSON.stringify(mockPayload))

      await outputService.submit(
        mockContext,
        mockRequest,
        mockModel,
        'test@example.com',
        mockItems,
        mockSubmitResponse,
        mockFormMetadata
      )

      expect(mockFormatter).toHaveBeenCalledWith(
        mockContext,
        mockItems,
        mockModel,
        mockSubmitResponse,
        { isPreview: false, state: FormStatus.Live },
        mockFormMetadata
      )
    })

    it('skips publishing when notificationEmail is not present', async () => {
      const mockPayload = {
        meta: {
          formId: 'form-123',
          referenceNumber: 'REF-123456',
          formName: 'Test Form'
          // notificationEmail is missing
        },
        data: mockItems
      }

      mockFormatter.mockReturnValue(JSON.stringify(mockPayload))

      await outputService.submit(
        mockContext,
        mockRequest,
        mockModel,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        undefined, // This parameter is ignored, using undefined to match test intent
        mockItems,
        mockSubmitResponse,
        mockFormMetadata
      )

      expect(checkFormStatus).toHaveBeenCalledWith(mockRequest.params)
      expect(getFormatter).toHaveBeenCalledWith('adapter', '1')
      expect(mockFormatter).toHaveBeenCalledWith(
        mockContext,
        mockItems,
        mockModel,
        mockSubmitResponse,
        { isPreview: false, state: FormStatus.Live },
        mockFormMetadata
      )
      expect(publishFormAdapterEvent).not.toHaveBeenCalled()
    })

    it('skips publishing when notificationEmail is null', async () => {
      const mockPayload = {
        meta: {
          formId: 'form-123',
          referenceNumber: 'REF-123456',
          formName: 'Test Form',
          notificationEmail: null
        },
        data: mockItems
      }

      mockFormatter.mockReturnValue(JSON.stringify(mockPayload))

      await outputService.submit(
        mockContext,
        mockRequest,
        mockModel,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        null, // This parameter is ignored, using null to match test intent
        mockItems,
        mockSubmitResponse,
        mockFormMetadata
      )

      expect(checkFormStatus).toHaveBeenCalledWith(mockRequest.params)
      expect(getFormatter).toHaveBeenCalledWith('adapter', '1')
      expect(publishFormAdapterEvent).not.toHaveBeenCalled()
    })

    it('skips publishing when notificationEmail is empty string', async () => {
      const mockPayload = {
        meta: {
          formId: 'form-123',
          referenceNumber: 'REF-123456',
          formName: 'Test Form',
          notificationEmail: ''
        },
        data: mockItems
      }

      mockFormatter.mockReturnValue(JSON.stringify(mockPayload))

      await outputService.submit(
        mockContext,
        mockRequest,
        mockModel,
        'test@example.com',
        mockItems,
        mockSubmitResponse,
        mockFormMetadata
      )

      expect(checkFormStatus).toHaveBeenCalledWith(mockRequest.params)
      expect(getFormatter).toHaveBeenCalledWith('adapter', '1')
      expect(publishFormAdapterEvent).not.toHaveBeenCalled()
    })

    it('publishes when notificationEmail is present', async () => {
      const mockPayload = {
        meta: {
          formId: 'form-123',
          referenceNumber: 'REF-123456',
          formName: 'Test Form',
          notificationEmail: 'notify@example.com'
        },
        data: mockItems
      }

      mockFormatter.mockReturnValue(JSON.stringify(mockPayload))
      jest.mocked(publishFormAdapterEvent).mockResolvedValue('message-id-123')

      await outputService.submit(
        mockContext,
        mockRequest,
        mockModel,
        'test@example.com',
        mockItems,
        mockSubmitResponse,
        mockFormMetadata
      )

      expect(checkFormStatus).toHaveBeenCalledWith(mockRequest.params)
      expect(getFormatter).toHaveBeenCalledWith('adapter', '1')
      expect(publishFormAdapterEvent).toHaveBeenCalledWith(mockPayload)
    })
  })

  describe('createOutputService', () => {
    it('creates and returns OutputService instance', () => {
      const service = createOutputService()
      expect(service).toBeInstanceOf(OutputService)
    })

    it('creates new instance each time', () => {
      const service1 = createOutputService()
      const service2 = createOutputService()
      expect(service1).not.toBe(service2)
      expect(service1).toBeInstanceOf(OutputService)
      expect(service2).toBeInstanceOf(OutputService)
    })
  })
})

/**
 * @import { FormContext } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
 * @import { DetailItem } from '@defra/forms-engine-plugin/engine/models/types.js'
 * @import { SubmitResponsePayload, FormMetadata } from '@defra/forms-model'
 * @import { FormRequestPayload } from '@defra/forms-engine-plugin/types'
 */
