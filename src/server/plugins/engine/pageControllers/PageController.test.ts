import { type ResponseToolkit } from '@hapi/hapi'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { type FormRequest } from '~/src/server/routes/types.js'
import definition from '~/test/form/definitions/basic.js'

describe('PageController', () => {
  let model: FormModel
  let controller1: PageController
  let controller2: PageController

  beforeEach(() => {
    const { pages } = definition

    const page1 = pages[0]
    const page2 = pages[1]

    model = new FormModel(definition, {
      basePath: 'test'
    })

    controller1 = new PageController(model, page1)
    controller2 = new PageController(model, page2)
  })

  describe('Route handlers', () => {
    const page1Url = new URL('http://example.com/test/licence')

    const request = {
      method: 'get',
      url: page1Url,
      path: page1Url.pathname,
      params: {
        path: 'licence',
        slug: 'test'
      },
      query: {},
      app: { model }
    } as FormRequest

    const h: Pick<ResponseToolkit, 'redirect' | 'view'> = {
      redirect: jest.fn(),
      view: jest.fn()
    }

    it('returns default route options', () => {
      expect(controller1.getRouteOptions).toEqual({})
      expect(controller1.postRouteOptions).toEqual({})
    })

    it('supports GET route handler', async () => {
      expect(() => controller1.makeGetRouteHandler()).not.toThrow()
      expect(() => controller1.makeGetRouteHandler()).toBeInstanceOf(Function)

      await controller1.makeGetRouteHandler()(request, h)
      await controller2.makeGetRouteHandler()(request, h)

      expect(h.view).toHaveBeenNthCalledWith(1, controller1.viewName)
      expect(h.view).toHaveBeenNthCalledWith(2, controller1.viewName)
    })

    it('does not support POST route handler', () => {
      expect(() => controller1.makePostRouteHandler()).toThrow(
        'Unsupported POST route handler for this page'
      )
    })
  })
})
