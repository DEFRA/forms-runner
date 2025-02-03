import {
  ControllerType,
  controllerNameFromPath,
  isControllerName,
  type Page
} from '@defra/forms-model'

import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
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
 * Creates page instance for each {@link Page} type
 */
export function createPage(model: FormModel, pageDef: Page) {
  const controllerName = controllerNameFromPath(pageDef.controller)

  if (!pageDef.controller) {
    return new PageControllers.QuestionPageController(model, pageDef)
  }

  // Patch legacy controllers
  if (controllerName && pageDef.controller !== controllerName) {
    pageDef.controller = controllerName
  }

  let controller: PageControllerClass | undefined

  switch (pageDef.controller) {
    case ControllerType.Start:
      controller = new PageControllers.StartPageController(model, pageDef)
      break

    case ControllerType.Page:
      controller = new PageControllers.QuestionPageController(model, pageDef)
      break

    case ControllerType.Terminal:
      controller = new PageControllers.TerminalPageController(model, pageDef)
      break

    case ControllerType.Summary:
      controller = new PageControllers.SummaryPageController(model, pageDef)
      break

    case ControllerType.Status:
      controller = new PageControllers.StatusPageController(model, pageDef)
      break

    case ControllerType.FileUpload:
      controller = new PageControllers.FileUploadPageController(model, pageDef)
      break

    case ControllerType.Repeat:
      controller = new PageControllers.RepeatPageController(model, pageDef)
      break
  }

  if (typeof controller === 'undefined') {
    if (model.controllers?.[pageDef.controller]) {
      const Ctrl = model.controllers[pageDef.controller]
      // @ts-expect-error - TODO: Sort out the types so it understands that some controllers are custom/user provided
      controller = new Ctrl(model, pageDef)
    }
  }

  if (typeof controller === 'undefined') {
    throw new Error(`Page controller ${pageDef.controller} does not exist`)
  }

  return controller
}

/**
 * In local development environments, we sometimes need to rewrite the
 * CDP upload URL to work with CSP/CORS restrictions.
 * This helper function rewrites localhost URLs to use the sslip.io proxy
 * This is only used when running locally with a development proxy.
 * In non-local environments, this function returns null
 * @param uploadUrl - The original upload URL from CDP
 */
export function getProxyUrlForLocalDevelopment(
  uploadUrl?: string
): string | null {
  if (!uploadUrl?.includes('localhost:7337')) {
    return null
  }

  return uploadUrl.replace(
    /localhost:7337/g,
    'uploader.127.0.0.1.sslip.io:7300'
  )
}
