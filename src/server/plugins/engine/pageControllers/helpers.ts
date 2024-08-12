import path from 'node:path'

import { type Page } from '@defra/forms-model'
import camelCase from 'lodash/camelCase.js'
import upperFirst from 'lodash/upperFirst.js'

import * as PageControllers from '~/src/server/plugins/engine/pageControllers/index.js'

export function controllerNameFromPath(nameOrPath?: string) {
  if (!nameOrPath || !path.extname(nameOrPath)) {
    return nameOrPath
  }

  const fileName = camelCase(path.basename(nameOrPath).split('.')[0])
  const prefix = fileName !== 'page' ? upperFirst(fileName) : ''

  return `${prefix}PageController`
}

export function isPageController(
  controllerName?: string
): controllerName is keyof typeof PageControllers {
  return !!controllerName && controllerName in PageControllers
}

export type PageControllerClass = InstanceType<PageControllerType>
export type PageControllerType =
  (typeof PageControllers)[keyof typeof PageControllers]

/**
 * Gets the class for the controller defined in a {@link Page}
 */
export function getPageController(
  nameOrPath: string
): PageControllerType | undefined {
  const controllerName = controllerNameFromPath(nameOrPath)

  if (!isPageController(controllerName)) {
    return
  }

  return PageControllers[controllerName]
}
