import path from 'node:path'

import { type Page } from '@defra/forms-model'
import camelCase from 'lodash/camelCase.js'
import upperFirst from 'lodash/upperFirst.js'

import { DobPageController } from '~/src/server/plugins/engine/pageControllers/DobPageController.js'
import { HomePageController } from '~/src/server/plugins/engine/pageControllers/HomePageController.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { PageControllerBase } from '~/src/server/plugins/engine/pageControllers/PageControllerBase.js'
import { RepeatingFieldPageController } from '~/src/server/plugins/engine/pageControllers/RepeatingFieldPageController.js'
import { StartDatePageController } from '~/src/server/plugins/engine/pageControllers/StartDatePageController.js'
import { StartPageController } from '~/src/server/plugins/engine/pageControllers/StartPageController.js'
import { SummaryPageController } from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { UploadPageController } from '~/src/server/plugins/engine/pageControllers/UploadPageController.js'

const PageControllers = {
  DobPageController,
  HomePageController,
  PageController,
  StartDatePageController,
  StartPageController,
  SummaryPageController,
  PageControllerBase,
  RepeatingFieldPageController,
  UploadPageController
}

export const controllerNameFromPath = (filePath: string) => {
  const fileName = path.basename(filePath).split('.')[0]
  return `${upperFirst(camelCase(fileName))}PageController`
}

/**
 * Gets the class for the controller defined in a {@link Page}
 */
export const getPageController = (nameOrPath: Page['controller']) => {
  const isPath = !!path.extname(nameOrPath)
  const controllerName = isPath
    ? controllerNameFromPath(nameOrPath)
    : nameOrPath

  return PageControllers[controllerName ?? 'PageControllerBase']
}
