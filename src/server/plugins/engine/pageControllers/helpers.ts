import {
  controllerNameFromPath,
  isControllerName,
  type ControllerType,
  type Page
} from '@defra/forms-model'

import * as PageControllers from '~/src/server/plugins/engine/pageControllers/index.js'

export function isPageController(
  controllerName?: string | ControllerType
): controllerName is keyof typeof PageControllers {
  return isControllerName(controllerName) && controllerName in PageControllers
}

export type PageControllerClass = InstanceType<PageControllerType>
export type PageControllerType =
  (typeof PageControllers)[keyof typeof PageControllers]

/**
 * Gets the class for the controller defined in a {@link Page}
 */
export function getPageController(nameOrPath?: string): PageControllerType {
  const controllerName = controllerNameFromPath(nameOrPath)

  if (!isPageController(controllerName)) {
    return PageControllers.PageController
  }

  return PageControllers[controllerName]
}
