import { type CacheService } from '@defra/forms-engine-plugin/cache-service.js'
import { type QuestionPageController } from '@defra/forms-engine-plugin/controllers/QuestionPageController.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import { buildFormRequest } from '@defra/forms-engine-plugin/engine/pageControllers/__stubs__/request.js'
import { type FormSubmissionState } from '@defra/forms-engine-plugin/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormResponseToolkit
} from '@defra/forms-engine-plugin/types'
import {
  ControllerType,
  type PageSummaryWithConfirmationEmail
} from '@defra/forms-model'

import {
  SummaryPageWithConfirmationEmailController,
  getUserConfirmationEmailAddress
} from '~/src/server/plugins/SummaryPageWithConfirmationEmailController.js'
import definition from '~/test/form/definitions/basic.js'

describe('SummaryPageWithConfirmationEmailController', () => {
  let model: FormModel
  let controller: SummaryPageWithConfirmationEmailController
  let requestPage: FormRequest

  const response = {
    code: jest.fn().mockImplementation(() => response)
  }
  const h: FormResponseToolkit = {
    redirect: jest.fn().mockReturnValue(response),
    view: jest.fn()
  }

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })

    // Create a mock page for SummaryPageWithConfirmationEmailController
    const mockPage = {
      ...definition.pages[0],
      controller: ControllerType.SummaryWithConfirmationEmail
    } as unknown as PageSummaryWithConfirmationEmail

    controller = new SummaryPageWithConfirmationEmailController(model, mockPage)

    requestPage = buildFormRequest({
      method: 'get',
      url: new URL('http://example.com/test/summary'),
      path: '/test/summary',
      params: {
        path: 'summary',
        slug: 'test'
      },
      query: {},
      app: { model }
    } as FormRequest)
  })

  describe('handle errors', () => {
    it('should display errors including summary', async () => {
      const state: FormSubmissionState = {
        $$__referenceNumber: 'foobar',
        licenceLength: 365,
        fullName: 'John Smith'
      }
      const request = {
        ...requestPage,
        method: 'post',
        payload: { invalid: '123', action: 'send' }
      } as unknown as FormRequestPayload

      const context = model.getFormContext(request, state)

      jest
        .spyOn(controller as unknown as QuestionPageController, 'getState')
        .mockResolvedValue({})
      jest
        .spyOn(controller as unknown as QuestionPageController, 'setState')
        .mockResolvedValue(state)

      const postHandler = controller.makePostRouteHandler()
      await postHandler(request, context, h)

      const viewModel = controller.getSummaryViewModel(request, context)

      expect(h.view).toHaveBeenCalledWith('summary', expect.anything())
      expect(viewModel.errors).toHaveLength(1)
      const errorText = viewModel.errors ? viewModel.errors[0].text : ''
      expect(errorText).toBe('"invalid" is not allowed')
    })
  })

  describe('handleSaveAndExit', () => {
    it('should invoke saveAndExit plugin option', async () => {
      const saveAndExitMock = jest.fn(() => ({}))
      const state: FormSubmissionState = {
        $$__referenceNumber: 'foobar',
        licenceLength: 365,
        fullName: 'John Smith'
      }
      const request = {
        ...requestPage,
        server: {
          plugins: {
            'forms-engine-plugin': {
              saveAndExit: saveAndExitMock,
              cacheService: {
                clearState: jest.fn()
              } as unknown as CacheService
            }
          }
        },
        method: 'post',
        payload: { fullName: 'John Smith', action: 'save-and-exit' }
      } as unknown as FormRequestPayload

      const context = model.getFormContext(request, state)

      const postHandler = controller.makePostRouteHandler()
      await postHandler(request, context, h)

      expect(saveAndExitMock).toHaveBeenCalledWith(request, h, context)
    })
  })

  describe('getUserConfirmationEmailAddress', () => {
    test('should get confirmation email', () => {
      const field = getUserConfirmationEmailAddress()
      expect(field.name).toBe('userConfirmationEmailAddress')
      expect(field.value).toBeUndefined()
    })

    test('should get confirmation email with retained value', () => {
      const field = getUserConfirmationEmailAddress({
        userConfirmationEmailAddress: 'emailval'
      })
      expect(field.name).toBe('userConfirmationEmailAddress')
      expect(field.value).toBe('emailval')
    })
  })
})
