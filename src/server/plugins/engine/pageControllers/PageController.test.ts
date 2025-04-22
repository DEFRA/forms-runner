import { type ResponseToolkit } from '@hapi/hapi'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { type FormRequest } from '~/src/server/routes/types.js'
import definition from '~/test/form/definitions/basic.js'

describe('PageController', () => {
  let model: FormModel
  let controller1: PageController
  let controller2: PageController

  const testBasePath = 'form/test'

  beforeEach(() => {
    const { pages } = definition

    const page1 = pages[0]
    const page2 = pages[1]

    model = new FormModel(definition, {
      basePath: testBasePath
    })

    controller1 = new PageController(model, page1)
    controller2 = new PageController(model, page2)
  })

  describe('Properties', () => {
    it('returns path', () => {
      expect(controller1).toHaveProperty('path', '/licence')
      expect(controller2).toHaveProperty('path', '/full-name')
    })

    it('returns href', () => {
      expect(controller1).toHaveProperty('href', `/${testBasePath}/licence`)
      expect(controller2).toHaveProperty('href', `/${testBasePath}/full-name`)
    })

    it('returns keys (empty)', () => {
      expect(controller1).toHaveProperty('keys', [])
      expect(controller2).toHaveProperty('keys', [])
    })

    it('returns the page section', () => {
      expect(controller1).toHaveProperty('section', {
        name: 'licenceDetails',
        title: 'Licence details',
        hideTitle: false
      })

      expect(controller2).toHaveProperty('section', {
        name: 'personalDetails',
        title: 'Personal details',
        hideTitle: false
      })
    })

    it('returns feedback link (from form definition)', () => {
      expect(controller1).toHaveProperty('feedbackLink', undefined)

      const emailAddress = 'test@feedback.cat'

      model.def.feedback = {
        emailAddress
      }

      expect(controller1).toHaveProperty(
        'feedbackLink',
        `mailto:${emailAddress}`
      )
    })

    it('returns phase tag (from form definition)', () => {
      expect(controller1).toHaveProperty('phaseTag', undefined)

      model.def.phaseBanner = {
        phase: 'alpha'
      }

      expect(controller1).toHaveProperty('phaseTag', 'alpha')
    })

    it('sets default viewName to "index"', () => {
      expect(controller1).toHaveProperty('viewName', 'index')
      expect(controller2).toHaveProperty('viewName', 'index')
    })

    it('overrides viewName when pageDef.view is provided', () => {
      const customPage = {
        ...definition.pages[0],
        view: 'custom-view'
      }

      const customController = new PageController(model, customPage)

      expect(customController).toHaveProperty('viewName', 'custom-view')
    })
  })

  describe('Path methods', () => {
    describe('Link href', () => {
      it('prefixes paths into link hrefs', () => {
        const href1 = controller1.getHref('/')
        const href2 = controller1.getHref('/page-one')

        expect(href1).toBe(`/${testBasePath}`)
        expect(href2).toBe(`/${testBasePath}/page-one`)
      })
    })

    describe('Start path', () => {
      it('returns path to start page', () => {
        const startPath = controller1.getStartPath()
        expect(startPath).toBe('/licence')
      })

      it('returns path to start page (default)', () => {
        delete model.def.startPage

        const startPath = controller1.getStartPath()
        expect(startPath).toBe('/start')
      })
    })

    describe('Summary path', () => {
      it('returns path to summary page', () => {
        const summaryPath = controller1.getSummaryPath()
        expect(summaryPath).toBe('/summary')
      })
    })

    describe('Status path', () => {
      it('returns path to status page', () => {
        const summaryPath = controller1.getStatusPath()
        expect(summaryPath).toBe('/status')
      })
    })
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

      await controller1.makeGetRouteHandler()(
        request,
        model.getFormContext(request, {}),
        h
      )

      await controller2.makeGetRouteHandler()(
        request,
        model.getFormContext(request, {}),
        h
      )

      expect(h.view).toHaveBeenNthCalledWith(
        1,
        controller1.viewName,
        expect.objectContaining({
          pageTitle: 'Buy a rod fishing licence',
          sectionTitle: 'Licence details'
        })
      )

      expect(h.view).toHaveBeenNthCalledWith(
        2,
        controller1.viewName,
        expect.objectContaining({
          pageTitle: "What's your name?",
          sectionTitle: 'Personal details'
        })
      )
    })

    it('does not support POST route handler', () => {
      expect(() => controller1.makePostRouteHandler()).toThrow(
        'Unsupported POST route handler for this page'
      )
    })
  })
})
