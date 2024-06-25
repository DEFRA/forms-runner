import path from 'node:path'

import { type Page } from '@defra/forms-model'
import camelCase from 'lodash/camelCase.js'
import upperFirst from 'lodash/upperFirst.js'

import * as PageControllers from '~/src/server/plugins/engine/pageControllers/index.js'

export function controllerNameFromPath(filePath: string) {
  const fileName = path.basename(filePath).split('.')[0]
  return `${upperFirst(camelCase(fileName))}PageController`
}

export function isPageController(
  controllerName: string
): controllerName is keyof typeof PageControllers {
  return controllerName in PageControllers
}

export type PageControllerClass = InstanceType<PageControllerType>
export type PageControllerType =
  (typeof PageControllers)[keyof typeof PageControllers]

/**
 * Gets the class for the controller defined in a {@link Page}
 */
export function getPageController(nameOrPath: string): PageControllerType {
  const controllerName = path.extname(nameOrPath)
    ? controllerNameFromPath(nameOrPath)
    : nameOrPath

  if (!isPageController(controllerName)) {
    return PageControllers.PageControllerBase
  }

  return PageControllers[controllerName]
}
