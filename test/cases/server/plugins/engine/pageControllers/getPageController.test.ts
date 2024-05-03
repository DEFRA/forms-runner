import {
  controllerNameFromPath,
  getPageController
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import * as PageControllers from '~/src/server/plugins/engine/pageControllers/index.js'

describe('Engine Page Controllers getPageController', () => {
  describe('controllerNameFromPath', () => {
    test('controller name is extracted correctly', () => {
      const filePath = './pages/summary.js'
      const controllerName = controllerNameFromPath(filePath)
      expect(controllerName).toBe('SummaryPageController')
    })

    test('kebab-case is pascal-case', () => {
      const filePath = './pages/dob.js'
      const controllerName = controllerNameFromPath(filePath)
      expect(controllerName).toBe('DobPageController')
    })
  })

  describe('getPageController', () => {
    test('it returns DobPageController when a legacy path is passed', () => {
      const controllerFromPath = getPageController('./pages/dob.js')
      expect(controllerFromPath).toEqual(PageControllers.DobPageController)

      const controllerFromName = getPageController('DobPageController')
      expect(controllerFromName).toEqual(PageControllers.DobPageController)
    })

    test('it returns HomePageController when a legacy path is passed', () => {
      const controllerFromPath = getPageController('./pages/home.js')
      expect(controllerFromPath).toEqual(PageControllers.HomePageController)

      const controllerFromName = getPageController('HomePageController')
      expect(controllerFromName).toEqual(PageControllers.HomePageController)
    })

    test('it returns StartDatePageController when a legacy path is passed', () => {
      const controllerFromPath = getPageController('./pages/start-date.js')
      expect(controllerFromPath).toEqual(
        PageControllers.StartDatePageController
      )

      const controllerFromName = getPageController('StartDatePageController')
      expect(controllerFromName).toEqual(
        PageControllers.StartDatePageController
      )
    })

    test('it returns StartPageController when a legacy path is passed', () => {
      const controllerFromPath = getPageController('./pages/start.js')
      expect(controllerFromPath).toEqual(PageControllers.StartPageController)

      const controllerFromName = getPageController('StartPageController')
      expect(controllerFromName).toEqual(PageControllers.StartPageController)
    })

    test('it returns SummaryPageController when a legacy path is passed', () => {
      const controllerFromPath = getPageController('./pages/summary.js')
      expect(controllerFromPath).toEqual(PageControllers.SummaryPageController)

      const controllerFromName = getPageController('SummaryPageController')
      expect(controllerFromName).toEqual(PageControllers.SummaryPageController)
    })
  })
})
