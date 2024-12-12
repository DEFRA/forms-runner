import { type FormDefinition, type Page } from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type Lifecycle,
  type ResponseToolkit,
  type RouteOptions
} from '@hapi/hapi'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'

export class PageController {
  /**
   * The base class for all page controllers. Page controllers are responsible for generating the get and post route handlers when a user navigates to `/{id}/{path*}`.
   */
  def: FormDefinition
  name?: string
  model: FormModel
  pageDef: Page
  title: string
  viewName = 'index'

  constructor(model: FormModel, pageDef: Page) {
    const { def } = model

    this.def = def
    this.name = def.name
    this.model = model
    this.pageDef = pageDef
    this.title = pageDef.title
  }

  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   */
  get getRouteOptions(): RouteOptions<FormRequestRefs> {
    return {}
  }

  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   */
  get postRouteOptions(): RouteOptions<FormRequestPayloadRefs> {
    return {}
  }

  makeGetRouteHandler(): (
    request: FormRequest,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>
  ) => ReturnType<Lifecycle.Method<FormRequestRefs>> {
    return (request, h) => h.view(this.viewName)
  }

  makePostRouteHandler(): (
    request: FormRequestPayload,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>
  ) => ReturnType<Lifecycle.Method<FormRequestPayloadRefs>> {
    throw Boom.badRequest('Unsupported POST route handler for this page')
  }
}
