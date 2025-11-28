import { type QuestionPageController } from '@defra/forms-engine-plugin/controllers/QuestionPageController.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import { buildFormRequest } from '@defra/forms-engine-plugin/engine/pageControllers/__stubs__/request.js'
import { type FormSubmissionState } from '@defra/forms-engine-plugin/engine/types.js'
import {
  type FormContext,
  type FormRequest,
  type FormRequestPayload,
  type FormResponseToolkit
} from '@defra/forms-engine-plugin/types'
import { type PageQuestion } from '@defra/forms-model'

import { FeedbackPageController } from '~/src/server/plugins/FeedbackPageController.js'
import definition from '~/test/form/definitions/user-feedback.js'

describe('FeedbackPageController', () => {
  let model: FormModel
  let controller: FeedbackPageController
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

    // Create a mock page for FeedbackPageController
    const mockPage = {
      ...definition.pages[0],
      controller: 'FeedbackPageController'
    } as unknown as PageQuestion

    controller = new FeedbackPageController(model, mockPage)

    requestPage = buildFormRequest({
      method: 'get',
      url: new URL('http://example.com/test/give-feedback'),
      path: '/test/give-feedback',
      params: {
        path: 'give-feedback',
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
        formId: 365
      }
      const request = {
        ...requestPage,
        method: 'post',
        payload: { invalid: '123', action: 'send' }
      } as unknown as FormRequestPayload

      // Add error
      const context = {
        ...model.getFormContext(request, state),
        errors: [
          {
            name: 'PMPyjg',
            path: '/feedback',
            text: 'Select how you feel about this service'
          }
        ]
      } as FormContext

      jest
        .spyOn(controller as unknown as QuestionPageController, 'getState')
        .mockResolvedValue({})
      jest
        .spyOn(controller as unknown as QuestionPageController, 'setState')
        .mockResolvedValue(state)

      const postHandler = controller.makePostRouteHandler()
      await postHandler(request, context, h)

      const viewModel = controller.getViewModel(request, context)

      expect(viewModel.errors).toHaveLength(1)
      const errorText = viewModel.errors ? viewModel.errors[0].text : ''
      expect(errorText).toBe('Select how you feel about this service')
    })
  })
})
