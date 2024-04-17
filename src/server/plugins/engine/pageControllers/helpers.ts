import path from 'node:path'
import camelCase from 'lodash/camelCase.js'
import upperFirst from 'lodash/upperFirst.js'
import { DobPageController } from './DobPageController.js'
import { HomePageController } from './HomePageController.js'
import { PageController } from './PageController.js'
import { StartDatePageController } from './StartDatePageController.js'
import { StartPageController } from './StartPageController.js'
import { SummaryPageController } from './SummaryPageController.js'
import { PageControllerBase } from './PageControllerBase.js'
import { RepeatingFieldPageController } from './RepeatingFieldPageController.js'
import { Page } from '@defra/forms-model'
import { UploadPageController } from '../../../plugins/engine/pageControllers/UploadPageController.js'

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
