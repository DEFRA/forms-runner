/* eslint-disable @typescript-eslint/dot-notation */
import { ComponentType, type ComponentDef } from '@defra/forms-model'
import { type ResponseToolkit } from '@hapi/hapi'
import { type ValidationErrorItem, type ValidationResult } from 'joi'

import { tempItemSchema } from '~/src/server/plugins/engine/components/FileUploadField.js'
import { getError } from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  FileUploadPageController,
  prepareStatus
} from '~/src/server/plugins/engine/pageControllers/FileUploadPageController.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import * as pageHelpers from '~/src/server/plugins/engine/pageControllers/helpers.js'
import * as uploadService from '~/src/server/plugins/engine/services/uploadService.js'
import {
  FileStatus,
  UploadStatus,
  type FeaturedFormPageViewModel,
  type FormContext,
  type FormContextRequest,
  type FormParams,
  type FormSubmissionState,
  type UploadStatusFileResponse,
  type UploadStatusResponse
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'
import definition from '~/test/form/definitions/file-upload-basic.js'

type TestableFileUploadPageController = FileUploadPageController & {
  initiateAndStoreNewUpload(
    req: FormRequest,
    state: FormSubmissionState
  ): Promise<FormSubmissionState>
  mergeState(
    req: FormRequest,
    state: FormSubmissionState,
    merge: object
  ): Promise<FormSubmissionState>
  checkUploadStatus(
    request: FormRequest,
    state: FormSubmissionState,
    depth?: number
  ): Promise<FormSubmissionState>
  prepareStatus(status: UploadStatusFileResponse): UploadStatusFileResponse
}

describe('FileUploadPageController', () => {
  let model: FormModel
  let controller: FileUploadPageController
  let request: FormRequest

  beforeEach(() => {
    const { pages } = structuredClone(definition)

    model = new FormModel(definition, {
      basePath: 'test'
    })

    controller = new FileUploadPageController(model, pages[0])
    request = {
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
        level: 'info'
      },
      services: jest.fn().mockReturnValue({
        cacheService: {
          setFlash: jest.fn(),
          setState: jest
            .fn()
            .mockImplementation((req, updated) => Promise.resolve(updated))
        }
      }),
      query: {}
    } as unknown as FormRequest
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  describe('Constructor', () => {
    const textComponent: ComponentDef = {
      name: 'fullName',
      title: 'Full name',
      type: ComponentType.TextField,
      options: {},
      schema: {}
    }

    it('throws unless there is exactly 1 file upload component', () => {
      const { pages } = structuredClone(definition)

      // @ts-expect-error - Allow invalid component for test
      pages[0].components = [textComponent]

      expect(() => new FileUploadPageController(model, pages[0])).toThrow(
        `Expected 1 FileUploadFieldComponent in FileUploadPageController '${pages[0].path}'`
      )
    })

    it('throws unless file upload component is the first in the form', () => {
      const { pages } = structuredClone(definition)

      // @ts-expect-error - Allow invalid component for test
      pages[0].components.unshift(textComponent)

      expect(() => new FileUploadPageController(model, pages[0])).toThrow(
        `Expected 'fileUpload' to be the first form component in FileUploadPageController '${pages[0].path}'`
      )
    })
  })

  describe('Form validation', () => {
    it('includes title text and error', () => {
      const result = controller.collection.validate()

      expect(result.errors).toEqual([
        {
          path: ['fileUpload'],
          href: '#fileUpload',
          name: 'fileUpload',
          text: 'Select upload something',
          context: {
            key: 'fileUpload',
            label: 'Upload something',
            title: 'Upload something'
          }
        }
      ])
    })

    it('includes all field errors', () => {
      const result = controller.collection.validate()
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('checkUploadStatus', () => {
    describe('error handling', () => {
      it('throws error when getUploadStatus returns empty response', async () => {
        const state = {
          upload: {
            [controller.path]: {
              upload: {
                uploadId: 'some-id',
                uploadUrl: 'some-url',
                statusUrl: 'some-status-url'
              },
              files: []
            }
          }
        } as unknown as FormSubmissionState

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockResolvedValue(undefined)

        await expect(
          controller['checkUploadStatus'](request, state, 1)
        ).rejects.toThrow(
          'Unexpected empty response from getUploadStatus for some-id'
        )
      })

      it('handles pending upload with backoff and retries', async () => {
        const state = {
          upload: {
            [controller.path]: {
              upload: {
                uploadId: 'some-id',
                uploadUrl: 'some-url',
                statusUrl: 'some-status-url'
              },
              files: []
            }
          }
        } as unknown as FormSubmissionState

        const pendingStatus = {
          uploadStatus: UploadStatus.pending,
          form: { file: { fileStatus: FileStatus.complete } }
        }

        const getUploadStatusSpy = jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockResolvedValueOnce(pendingStatus as UploadStatusResponse)
          .mockResolvedValueOnce({
            uploadStatus: UploadStatus.initiated
          } as UploadStatusResponse)

        await controller['checkUploadStatus'](request, state, 1)

        expect(getUploadStatusSpy).toHaveBeenCalledTimes(2)
        expect(request.logger.info).toHaveBeenCalled()

        const logMsg = (request.logger.info as jest.Mock).mock.calls[0][0]
        expect(logMsg).toEqual(expect.stringContaining('Waiting'))
        expect(logMsg).toEqual(expect.stringContaining('some-id'))
      }, 3000)

      it('throws gateway timeout when maximum retry depth is exceeded, logs an error, and re-initiates a new upload', async () => {
        const state = {
          upload: {
            [controller.path]: {
              upload: {
                uploadId: 'some-id',
                uploadUrl: 'some-url',
                statusUrl: 'some-status-url'
              },
              files: []
            }
          }
        } as unknown as FormSubmissionState

        const pendingStatus = {
          uploadStatus: UploadStatus.pending,
          form: { file: { fileStatus: FileStatus.pending } }
        }

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockResolvedValue(pendingStatus as UploadStatusResponse)

        const initiateSpy = jest
          .spyOn(
            controller as TestableFileUploadPageController,
            'initiateAndStoreNewUpload'
          )
          .mockResolvedValue(state as never)

        await expect(
          controller['checkUploadStatus'](request, state, 7)
        ).rejects.toThrow(
          'Timed out waiting for some-id after cumulative retries exceeding 55 seconds'
        )

        expect(request.logger.error).toHaveBeenCalledWith(
          expect.stringContaining(
            'Exceeded cumulative retry delay for some-id (depth: 7). Re-initiating a new upload.'
          )
        )

        expect(initiateSpy).toHaveBeenCalledWith(request, state)
      })

      it('throws error when initiateUpload returns undefined', async () => {
        const state = {
          upload: {
            [controller.path]: {
              upload: {},
              files: []
            }
          }
        } as unknown as FormSubmissionState

        jest.spyOn(uploadService, 'initiateUpload').mockResolvedValue(undefined)

        await expect(
          controller['checkUploadStatus'](request, state, 1)
        ).rejects.toThrow('Unexpected empty response from initiateUpload')
      })

      it('handles pending file status with custom error message', async () => {
        const state = {
          upload: {
            [controller.path]: {
              upload: {
                uploadId: 'some-id',
                uploadUrl: 'some-url',
                statusUrl: 'some-status-url'
              },
              files: []
            }
          }
        } as unknown as FormSubmissionState

        const pendingStatus = {
          uploadStatus: UploadStatus.ready,
          form: {
            file: {
              fileStatus: FileStatus.pending,
              errorMessage: 'Custom error message'
            }
          }
        }

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockResolvedValue(pendingStatus as UploadStatusResponse)

        jest.spyOn(tempItemSchema, 'validate').mockReturnValue({
          value: {
            uploadId: 'some-id',
            status: pendingStatus,
            type: 'object.unknown',
            path: ['fileUpload', 'errorMessage'],
            context: { value: 'Custom error message' }
          },
          error: undefined
        } as ValidationResult)

        const testController = controller as TestableFileUploadPageController
        const initiateSpy = jest.spyOn(
          testController,
          'initiateAndStoreNewUpload'
        )
        initiateSpy.mockResolvedValue(state as never)

        const { cacheService } = request.services([])
        await controller['checkUploadStatus'](request, state, 1)

        expect(cacheService.setFlash).toHaveBeenCalledWith(request, {
          errors: [
            {
              path: ['fileUpload'],
              href: '#fileUpload',
              name: 'fileUpload',
              text: 'Custom error message'
            }
          ]
        })
      })
    })

    describe('state management', () => {
      it('returns existing state when upload status is initiated', async () => {
        const state = {
          upload: {
            [controller.path]: {
              upload: {
                uploadId: 'some-id',
                uploadUrl: 'some-url',
                statusUrl: 'some-status-url'
              },
              files: []
            }
          }
        } as unknown as FormSubmissionState

        jest.spyOn(uploadService, 'getUploadStatus').mockResolvedValue({
          uploadStatus: UploadStatus.initiated
        } as UploadStatusResponse)
        const result = await controller['checkUploadStatus'](request, state, 1)
        expect(result).toBe(state)
      })

      it('returns early when all files are updated', async () => {
        const files = ['file1', 'file2']
        const filesUpdated = [...files]
        const state = {
          upload: {
            [controller.path]: {
              upload: {
                uploadId: 'some-id',
                uploadUrl: 'some-url',
                statusUrl: 'some-status-url'
              },
              files,
              filesUpdated
            }
          }
        } as unknown as FormSubmissionState

        const readyStatus = {
          uploadStatus: UploadStatus.ready,
          form: { file: { fileStatus: FileStatus.complete } }
        }

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockResolvedValue(readyStatus as UploadStatusResponse)

        jest.spyOn(tempItemSchema, 'validate').mockReturnValue({
          value: { status: readyStatus },
          error: undefined
        } as ValidationResult)

        const testController = controller as TestableFileUploadPageController
        const initiateSpy = jest.spyOn(
          testController,
          'initiateAndStoreNewUpload'
        ) as jest.SpyInstance<
          Promise<FormSubmissionState>,
          [FormRequest, FormSubmissionState]
        >

        initiateSpy.mockResolvedValue(state)

        const result = await controller['checkUploadStatus'](request, state, 1)

        expect(result).toBe(state)
      })

      it('initiates new upload when no upload exists', async () => {
        const state = {
          upload: {
            [controller.path]: {
              upload: {},
              files: []
            }
          }
        } as unknown as FormSubmissionState

        const testController = controller as TestableFileUploadPageController

        const initiateSpy = jest.spyOn(
          testController,
          'initiateAndStoreNewUpload'
        ) as jest.SpyInstance<
          Promise<FormSubmissionState>,
          [FormRequest, FormSubmissionState]
        >

        initiateSpy.mockImplementation(
          (_req: FormRequest, s: FormSubmissionState) =>
            Promise.resolve(Object.assign({}, s, { initiated: true }))
        )

        const result = await controller['checkUploadStatus'](request, state, 1)

        expect(initiateSpy).toHaveBeenCalled()
        expect(result.initiated).toBe(true)
      })

      it('initiates new upload when file validation fails', async () => {
        const state = {
          upload: {
            [controller.path]: {
              upload: {
                uploadId: 'some-id',
                uploadUrl: 'some-url',
                statusUrl: 'some-status-url'
              },
              files: []
            }
          }
        } as unknown as FormSubmissionState

        jest.spyOn(uploadService, 'getUploadStatus').mockResolvedValue({
          uploadStatus: UploadStatus.ready,
          form: { file: { fileStatus: FileStatus.complete } }
        } as UploadStatusResponse)

        jest.spyOn(tempItemSchema, 'validate').mockReturnValue({
          value: {},
          error: new Error('Validation failed')
        } as ValidationResult)

        const testController = controller as TestableFileUploadPageController

        const initiateSpy = jest.spyOn(
          testController,
          'initiateAndStoreNewUpload'
        ) as jest.SpyInstance<
          Promise<FormSubmissionState>,
          [FormRequest, FormSubmissionState]
        >

        initiateSpy.mockImplementation(
          (
            _req: FormRequest,
            s: FormSubmissionState
          ): Promise<FormSubmissionState> =>
            Promise.resolve(Object.assign({}, s, { newUpload: true }))
        )
        const result = await controller['checkUploadStatus'](request, state, 1)

        expect(initiateSpy).toHaveBeenCalled()
        expect(result.newUpload).toBe(true)
      })

      it('merges state when file upload is complete', async () => {
        const state = {
          upload: {
            [controller.path]: {
              upload: {
                uploadId: 'some-id',
                uploadUrl: 'some-url',
                statusUrl: 'some-status-url'
              },
              files: []
            }
          }
        } as unknown as FormSubmissionState

        const completeStatus = {
          uploadStatus: UploadStatus.ready,
          form: { file: { fileStatus: FileStatus.complete } }
        }

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockResolvedValue(completeStatus as UploadStatusResponse)

        jest.spyOn(tempItemSchema, 'validate').mockReturnValue({
          value: {
            status: completeStatus,
            uploadId: 'some-id'
          },
          error: undefined
        } as ValidationResult)

        const testController = controller as TestableFileUploadPageController

        const mergeStateSpy = jest.spyOn(
          testController,
          'mergeState'
        ) as jest.SpyInstance<
          Promise<FormSubmissionState>,
          [FormRequest, FormSubmissionState, object]
        >

        mergeStateSpy.mockImplementation(
          (
            _req: FormRequest,
            s: FormSubmissionState,
            _merge: object
          ): Promise<FormSubmissionState> =>
            Promise.resolve(Object.assign({}, s, { merged: true }))
        )

        const initiateSpy = jest.spyOn(
          testController,
          'initiateAndStoreNewUpload'
        ) as jest.SpyInstance<
          Promise<FormSubmissionState>,
          [FormRequest, FormSubmissionState]
        >

        initiateSpy.mockImplementation(
          (
            _req: FormRequest,
            s: FormSubmissionState
          ): Promise<FormSubmissionState> =>
            Promise.resolve(Object.assign({}, s, { newUpload: true }))
        )

        const result = await controller['checkUploadStatus'](request, state, 1)

        expect(mergeStateSpy).toHaveBeenCalled()
        expect(result.newUpload).toBe(true)
      })
    })

    describe('error messaging', () => {
      describe('when file status is not complete', () => {
        it('sets flash error with provided message', async () => {
          const state = {
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          } as unknown as FormSubmissionState

          const errorStatus = {
            uploadStatus: UploadStatus.ready,
            form: {
              file: {
                fileStatus: FileStatus.rejected,
                errorMessage: 'Test error'
              }
            }
          }

          jest
            .spyOn(uploadService, 'getUploadStatus')
            .mockResolvedValue(errorStatus as UploadStatusResponse)

          jest.spyOn(tempItemSchema, 'validate').mockReturnValue({
            value: {
              status: errorStatus,
              uploadId: 'some-id'
            },
            error: undefined
          } as ValidationResult)

          const testController = controller as TestableFileUploadPageController

          const initiateSpy = jest.spyOn(
            testController,
            'initiateAndStoreNewUpload'
          ) as jest.SpyInstance<
            Promise<FormSubmissionState>,
            [FormRequest, FormSubmissionState]
          >

          initiateSpy.mockImplementation(
            (
              _req: FormRequest,
              s: FormSubmissionState
            ): Promise<FormSubmissionState> =>
              Promise.resolve(Object.assign({}, s, { newUpload: true }))
          )

          const { cacheService } = request.services([])
          await controller['checkUploadStatus'](request, state, 1)

          expect(cacheService.setFlash).toHaveBeenCalledWith(request, {
            errors: [
              {
                path: ['fileUpload'],
                href: '#fileUpload',
                name: 'fileUpload',
                text: 'Test error'
              }
            ]
          })
        })
      })

      describe('when file has error status', () => {
        it('sets flash error with error message', async () => {
          const state = {
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          } as unknown as FormSubmissionState

          const errorStatus = {
            uploadStatus: UploadStatus.ready,
            form: {
              file: {
                fileStatus: FileStatus.rejected,
                errorMessage: 'Test error message'
              }
            }
          }

          jest
            .spyOn(uploadService, 'getUploadStatus')
            .mockResolvedValue(errorStatus as UploadStatusResponse)

          jest.spyOn(tempItemSchema, 'validate').mockReturnValue({
            value: { status: errorStatus },
            error: undefined
          } as ValidationResult)

          const testController = controller as TestableFileUploadPageController

          const initiateSpy = jest.spyOn(
            testController,
            'initiateAndStoreNewUpload'
          ) as jest.SpyInstance<
            Promise<FormSubmissionState>,
            [FormRequest, FormSubmissionState]
          >

          initiateSpy.mockResolvedValue(state)

          const { cacheService } = request.services([])
          await controller['checkUploadStatus'](request, state, 1)

          expect(cacheService.setFlash).toHaveBeenCalledWith(request, {
            errors: [
              {
                path: ['fileUpload'],
                href: '#fileUpload',
                name: 'fileUpload',
                text: 'Test error message'
              }
            ]
          })
        })

        it('sets default error message when none provided', async () => {
          const state = {
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          } as unknown as FormSubmissionState

          const errorStatus = {
            uploadStatus: UploadStatus.ready,
            form: {
              file: {
                fileStatus: FileStatus.rejected
              }
            }
          }

          jest
            .spyOn(uploadService, 'getUploadStatus')
            .mockResolvedValue(errorStatus as UploadStatusResponse)

          jest.spyOn(tempItemSchema, 'validate').mockReturnValue({
            value: { status: errorStatus },
            error: undefined
          } as ValidationResult)

          const testController = controller as TestableFileUploadPageController

          const initiateSpy = jest.spyOn(
            testController,
            'initiateAndStoreNewUpload'
          ) as jest.SpyInstance<
            Promise<FormSubmissionState>,
            [FormRequest, FormSubmissionState]
          >

          initiateSpy.mockResolvedValue(state)

          const { cacheService } = request.services([])

          await controller['checkUploadStatus'](request, state, 1)

          expect(cacheService.setFlash).toHaveBeenCalledWith(request, {
            errors: [
              {
                path: ['fileUpload'],
                href: '#fileUpload',
                name: 'fileUpload',
                text: 'Unknown error'
              }
            ]
          })
        })
      })
    })

    describe('file removal', () => {
      it('returns early when no file is removed', async () => {
        const files = [{ uploadId: 'file1' }, { uploadId: 'file2' }]

        Object.defineProperty(request, 'params', {
          value: { itemId: 'nonexistent-file' },
          writable: true,
          configurable: true
        })

        const state = {
          upload: {
            [controller.path]: {
              upload: {
                uploadId: 'upload-123',
                uploadUrl: 'some-url',
                statusUrl: 'some-status-url'
              },
              files
            }
          }
        } as unknown as FormSubmissionState

        const testController = controller as TestableFileUploadPageController
        const mergeStateSpy = jest.spyOn(testController, 'mergeState')

        await controller['checkRemovedFiles'](
          request as FormRequestPayload,
          state
        )

        expect(mergeStateSpy).not.toHaveBeenCalled()
      })

      it('merges state when file is removed', async () => {
        const files = [{ uploadId: 'file1' }, { uploadId: 'file2' }]

        Object.defineProperty(request, 'params', {
          value: { itemId: 'file1' },
          writable: true,
          configurable: true
        })

        const state = {
          upload: {
            [controller.path]: {
              upload: {
                uploadId: 'upload-123',
                uploadUrl: 'some-url',
                statusUrl: 'some-status-url'
              },
              files
            }
          }
        } as unknown as FormSubmissionState

        const testController = controller as TestableFileUploadPageController
        const mergeStateSpy = jest.spyOn(testController, 'mergeState')

        await controller['checkRemovedFiles'](
          request as FormRequestPayload,
          state
        )

        expect(mergeStateSpy).toHaveBeenCalledWith(request, state, {
          upload: {
            [controller.path]: {
              files: [{ uploadId: 'file2' }],
              upload: {
                uploadId: 'upload-123',
                uploadUrl: 'some-url',
                statusUrl: 'some-status-url'
              }
            }
          }
        })
      })
    })
  })

  describe('prepareStatus', () => {
    describe('when file is pending', () => {
      it('adds error message when no error message exists', () => {
        const status = {
          form: {
            file: {
              fileStatus: FileStatus.pending,
              errorMessage: undefined
            }
          }
        } as UploadStatusFileResponse

        const result = prepareStatus(status)

        expect(result.form.file.errorMessage).toBe(
          'The selected file has not fully uploaded'
        )
      })

      it('preserves existing error message', () => {
        const existingError = 'Existing error message'
        const status = {
          form: {
            file: {
              fileStatus: FileStatus.pending,
              errorMessage: existingError
            }
          }
        } as UploadStatusFileResponse

        const result = prepareStatus(status)

        expect(result.form.file.errorMessage).toBe(existingError)
      })
    })

    describe('when file is not pending', () => {
      it('does not add error message', () => {
        const status = {
          form: {
            file: {
              fileStatus: FileStatus.complete,
              errorMessage: undefined
            }
          }
        } as UploadStatusFileResponse

        const result = prepareStatus(status)

        expect(result.form.file.errorMessage).toBeUndefined()
      })
    })
  })

  describe('getErrors', () => {
    let controller: FileUploadPageController

    beforeEach(() => {
      const { pages } = structuredClone(definition)
      const model = new FormModel(definition, { basePath: 'test' })
      controller = new FileUploadPageController(model, pages[0])
    })

    describe('when no details provided', () => {
      it('returns undefined', () => {
        const errors = controller.getErrors()
        expect(errors).toBeUndefined()
      })
    })

    describe('error handling', () => {
      it('handles non-upload errors using getError helper', () => {
        const errorDetail = {
          message: 'some error',
          path: ['otherField'],
          type: 'any.required'
        }
        const errors = controller.getErrors([errorDetail])
        expect(errors).toEqual([getError(errorDetail)])
      })

      it('handles upload root errors using getError helper', () => {
        const errorDetail = {
          message: 'some error',
          path: ['fileUpload'],
          type: 'any.required'
        }
        const errors = controller.getErrors([errorDetail])
        expect(errors).toEqual([getError(errorDetail)])
      })
    })

    describe('object.unknown type errors', () => {
      it('pushes an error with errorMessage', () => {
        const errorDetail = {
          message: 'some error',
          path: ['fileUpload', 'errorMessage'],
          type: 'object.unknown',
          context: { value: 'some error text' }
        }
        const errors = controller.getErrors([errorDetail])
        expect(errors).toEqual([
          {
            path: ['fileUpload', 'errorMessage'],
            href: '#fileUpload',
            name: 'fileUpload',
            text: 'some error text'
          }
        ])
      })

      it('handles non-string error message values with default text', () => {
        const errorDetail = {
          message: 'some error',
          path: ['fileUpload', 'errorMessage'],
          type: 'object.unknown',
          context: { value: { some: 'object' } }
        }
        const errors = controller.getErrors([errorDetail])
        expect(errors).toEqual([
          {
            path: ['fileUpload', 'errorMessage'],
            href: '#fileUpload',
            name: 'fileUpload',
            text: 'Unknown error'
          }
        ])
      })

      it('handles object.unknown error type with errorMessage path', () => {
        const details = [
          {
            type: 'object.unknown',
            path: ['fileUpload', 'errorMessage'],
            context: { value: 'Custom error message' }
          }
        ] as ValidationErrorItem[]

        const errors = controller.getErrors(details)

        expect(errors).toEqual([
          {
            path: ['fileUpload', 'errorMessage'],
            href: '#fileUpload',
            name: 'fileUpload',
            text: 'Custom error message'
          }
        ])
      })
    })
  })

  describe('initiateAndStoreNewUpload', () => {
    it('throws error when initiateUpload returns undefined', async () => {
      const state = {
        upload: {
          '/test/file-upload': {
            upload: {},
            files: []
          }
        }
      } as unknown as FormSubmissionState

      jest.spyOn(uploadService, 'initiateUpload').mockResolvedValue(undefined)

      await expect(
        (
          controller['initiateAndStoreNewUpload'] as (
            req: FormRequest,
            state: FormSubmissionState
          ) => Promise<FormSubmissionState>
        )(request, state)
      ).rejects.toThrow('Unexpected empty response from initiateUpload')
    })
  })

  describe('makeGetItemDeleteRouteHandler', () => {
    it('throws notFound error when file to delete does not exist', () => {
      const state = {
        upload: {
          [controller.path]: {
            files: [
              {
                uploadId: 'file-1',
                status: { form: { file: { filename: 'file-1.pdf' } } }
              },
              {
                uploadId: 'file-2',
                status: { form: { file: { filename: 'file-2.pdf' } } }
              }
            ]
          }
        }
      }

      const request = {
        params: { itemId: 'I do not exist' }
      } as unknown as FormRequest

      const context = { state } as unknown as FormContext
      const h = {} as unknown as Pick<ResponseToolkit, 'redirect' | 'view'>

      const handler = controller.makeGetItemDeleteRouteHandler()

      expect(() => handler(request, context, h)).toThrow(
        'File to delete not found'
      )
    })
  })

  describe('makePostItemDeleteRouteHandler', () => {
    it('proceeds without deleting when confirm is false', async () => {
      const request = {
        params: { itemId: 'file-1' }
      } as unknown as FormRequestPayload

      const h = {
        redirect: jest.fn()
      } as unknown as Pick<ResponseToolkit, 'redirect' | 'view'>

      const context = {
        state: {}
      } as unknown as FormContext

      jest
        .spyOn(controller, 'getFormParams')
        .mockReturnValue({ confirm: false } as unknown as FormParams)

      const proceedSpy = jest
        .spyOn(controller, 'proceed')
        .mockResolvedValue({ statusCode: 302 } as never)

      const handler = controller.makePostItemDeleteRouteHandler()
      await handler(request, context, h)

      expect(proceedSpy).toHaveBeenCalledWith(request, h)
    })
  })

  describe('getViewModel', () => {
    it('includes uploadId and proxyUrl in the view model', () => {
      const state = {
        upload: {
          [controller.path]: {
            upload: {
              uploadId: 'some-upload-id',
              uploadUrl: 'https://cdp-upload-and-scan.com/upload',
              statusUrl: 'https://cdp-upload-and-scan.com/status'
            },
            files: []
          }
        }
      } as unknown as FormSubmissionState

      const context = { state } as FormContext

      jest
        .spyOn(QuestionPageController.prototype, 'getViewModel')
        .mockReturnValue({
          components: [{ model: { id: 'fileUpload' } }]
        } as unknown as FeaturedFormPageViewModel)

      jest
        .spyOn(pageHelpers, 'getProxyUrlForLocalDevelopment')
        .mockReturnValue('http://uploader.127.0.0.1.sslip.io:7300')

      const viewModel = controller.getViewModel(
        request as FormContextRequest,
        context
      )

      expect(viewModel.uploadId).toBe('some-upload-id')
      expect(viewModel.proxyUrl).toBe('http://uploader.127.0.0.1.sslip.io:7300')
      expect(viewModel.formAction).toBe(
        'https://cdp-upload-and-scan.com/upload'
      )
    })
  })
})
