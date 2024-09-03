import { ControllerType, ControllerTypes } from '@defra/forms-model'

import {
  getPageController,
  isPageController,
  type PageControllerType
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  FileUploadPageController,
  HomePageController,
  PageController,
  StartPageController,
  StatusPageController,
  SummaryPageController
} from '~/src/server/plugins/engine/pageControllers/index.js'

describe('Page controller helpers', () => {
  const controllers = ControllerTypes.map((defaults) => {
    let controller: PageControllerType | undefined

    switch (defaults.name) {
      case ControllerType.Start:
        controller = StartPageController
        break

      case ControllerType.Home:
        controller = HomePageController
        break

      case ControllerType.Page:
        controller = PageController
        break

      case ControllerType.FileUpload:
        controller = FileUploadPageController
        break

      case ControllerType.Summary:
        controller = SummaryPageController
        break

      case ControllerType.Status:
        controller = StatusPageController
        break
    }

    return {
      ...defaults,
      controller
    }
  })

  describe('Helper: getPageController', () => {
    it.each([...controllers])(
      "returns page controller '$name'",
      ({ controller, name, path }) => {
        expect(getPageController(name)).toEqual(controller)

        // Check for legacy path support
        expect(getPageController(path)).toEqual(controller)
      }
    )
  })

  describe('Helper: isPageController', () => {
    it.each([...controllers])(
      "allows valid page controller '$name'",
      ({ name }) => {
        expect(isPageController(name)).toBe(true)
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
})
