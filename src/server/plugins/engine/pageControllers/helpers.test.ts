import {
  ComponentType,
  ControllerType,
  ControllerTypes,
  PageTypes,
  type Page
} from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  createPage,
  getProxyUrlForLocalDevelopment,
  isPageController,
  type PageControllerType
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  FileUploadPageController,
  QuestionPageController,
  RepeatPageController,
  StartPageController,
  StatusPageController,
  SummaryPageController,
  TerminalPageController
} from '~/src/server/plugins/engine/pageControllers/index.js'
import definition from '~/test/form/definitions/blank.js'

describe('Page controller helpers', () => {
  const examples = PageTypes.map((pageType) => {
    const pageDef = structuredClone(pageType)

    let controller: PageControllerType | undefined

    switch (pageDef.controller) {
      case ControllerType.Start:
        controller = StartPageController
        break

      case ControllerType.Page:
        controller = QuestionPageController
        break

      case ControllerType.Terminal:
        controller = TerminalPageController
        break

      case ControllerType.Repeat:
        controller = RepeatPageController
        break

      case ControllerType.FileUpload:
        controller = FileUploadPageController

        // Avoid minimum component requirements
        pageDef.components = [
          {
            type: ComponentType.FileUploadField,
            name: 'fileUpload',
            title: 'Upload something',
            options: {},
            schema: {}
          }
        ]
        break

      case ControllerType.Summary:
        controller = SummaryPageController
        break

      case ControllerType.Status:
        controller = StatusPageController
        break
    }

    return {
      controller,
      pageDef
    }
  })

  describe('Helper: createPage', () => {
    const model = new FormModel(definition, {
      basePath: 'test'
    })

    it.each([...examples])(
      "creates page for controller '$pageDef.controller'",
      ({ controller, pageDef }) => {
        const pageDef1 = structuredClone(pageDef)
        const pageDef2 = structuredClone(pageDef)

        expect(createPage(model, pageDef1)).toBeInstanceOf(controller)

        const controllerType = ControllerTypes.find(
          ({ name }) => name === pageDef1.controller
        )

        // @ts-expect-error - Allow invalid property for test
        pageDef2.controller = controllerType?.path

        // Check for legacy path support
        expect(createPage(model, pageDef2)).toBeInstanceOf(controller)
      }
    )

    it('throws if page controller is unknown', () => {
      const pageDef: Page = {
        title: 'Unknown page',
        path: '/unknown-page',
        // @ts-expect-error - Allow invalid property for test
        controller: 'UnknownPageController'
      }

      expect(() => createPage(model, pageDef)).toThrow(
        `Page controller ${pageDef.controller} does not exist`
      )
    })
  })

  describe('Helper: isPageController', () => {
    it.each([...examples])(
      "allows valid page controller '$pageDef.controller'",
      ({ pageDef }) => {
        expect(isPageController(pageDef.controller)).toBe(true)
      }
    )

    it.each([
      { name: './pages/unknown.js' },
      { name: 'UnknownPageController' },
      { name: undefined },
      { name: '' }
    ])("rejects invalid page controller '$name'", ({ name }) => {
      expect(isPageController(name)).toBe(false)
    })
  })

  describe('Helper: getProxyUrlForLocalDevelopment', () => {
    it('returns null if uploadUrl is undefined', () => {
      expect(getProxyUrlForLocalDevelopment(undefined)).toBeNull()
    })

    it('returns null if uploadUrl does not include localhost:7337', () => {
      expect(getProxyUrlForLocalDevelopment('https://some-url.com')).toBeNull()
      expect(getProxyUrlForLocalDevelopment('http://localhost:8080')).toBeNull()
    })

    it('replaces localhost:7337 with uploader.127.0.0.1.sslip.io:7300', () => {
      const originalUrl = 'http://localhost:7337/upload'
      const expectedUrl = 'http://uploader.127.0.0.1.sslip.io:7300/upload'

      expect(getProxyUrlForLocalDevelopment(originalUrl)).toBe(expectedUrl)
    })

    it('handles multiple occurrences of localhost:7337', () => {
      const originalUrl =
        'http://localhost:7337/path?redirect=http://localhost:7337/callback'
      const expectedUrl =
        'http://uploader.127.0.0.1.sslip.io:7300/path?redirect=http://uploader.127.0.0.1.sslip.io:7300/callback'

      expect(getProxyUrlForLocalDevelopment(originalUrl)).toBe(expectedUrl)
    })
  })
})
