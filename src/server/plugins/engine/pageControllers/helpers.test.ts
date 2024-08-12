import {
  controllerNameFromPath,
  getPageController
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  HomePageController,
  PageController,
  StartPageController,
  SummaryPageController,
  StatusPageController
} from '~/src/server/plugins/engine/pageControllers/index.js'

describe('Page controller helpers', () => {
  const controllers = [
    {
      name: 'HomePageController',
      path: './pages/home.js',
      controller: HomePageController
    },
    {
      name: 'PageController',
      path: './pages/page.js',
      controller: PageController
    },
    {
      name: 'StartPageController',
      path: './pages/start.js',
      controller: StartPageController
    },
    {
      name: 'SummaryPageController',
      path: './pages/summary.js',
      controller: SummaryPageController
    },
    {
      name: 'StatusPageController',
      path: './pages/status.js',
      controller: StatusPageController
    }
  ]

  describe('Helper: controllerNameFromPath', () => {
    it.each([...controllers])(
      "returns controller name for '$path' legacy path",
      ({ name, path }) => {
        expect(controllerNameFromPath(path)).toEqual(name)
      }
    )
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
})
