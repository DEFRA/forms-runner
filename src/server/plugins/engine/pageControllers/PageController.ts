import {
  ControllerPath,
  type FormDefinition,
  type Page,
  type Section
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type Lifecycle,
  type ResponseToolkit,
  type RouteOptions
} from '@hapi/hapi'

import { type ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  encodeUrl,
  getStartPath,
  normalisePath
} from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormContext,
  type PageViewModelBase
} from '~/src/server/plugins/engine/types.js'
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
  id: string
  model: FormModel
  pageDef: Page
  title: string
  condition?: Schema
  section?: Section
  collection?: ComponentCollection
  viewName = 'index'

  constructor(model: FormModel, pageDef: Page) {
    const { def } = model

    this.def = def
    this.name = def.name
    this.model = model
    this.pageDef = pageDef
    this.id = pageDef.id
    this.title = pageDef.title

    // Resolve section
    this.section = model.sections.find(
      (section) => section.name === pageDef.section
    )

    if (pageDef.condition) {
      this.condition = this.makeCondition()
    }
  }

  get path() {
    return this.pageDef.path
  }

  get href() {
    const { path } = this
    return this.getHref(`/${normalisePath(path)}`)
  }

  get keys() {
    return this.collection?.keys ?? []
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

  get viewModel(): PageViewModelBase {
    const { name, section, title } = this

    const showTitle = true
    const pageTitle = title
    const sectionTitle = section?.hideTitle !== true ? section?.title : ''

    return {
      name,
      page: this,
      pageId: this.id,
      pageTitle,
      sectionTitle,
      showTitle,
      isStartPage: false,
      serviceUrl: this.getHref('/'),
      feedbackLink: this.feedbackLink,
      phaseTag: this.phaseTag,
      isTerminalPage: this.pageDef.controller === ControllerType.Terminal
    }
  }

  get feedbackLink() {
    const { def } = this

    // setting the feedbackLink to undefined here for feedback forms prevents the feedback link from being shown
    const feedbackLink = def.feedback?.emailAddress
      ? `mailto:${def.feedback.emailAddress}`
      : def.feedback?.url

    return encodeUrl(feedbackLink)
  }

  get phaseTag() {
    const { def } = this
    return def.phaseBanner?.phase
  }

  getHref(path: string) {
    const { model } = this

    return path === '/'
      ? `/${model.basePath}` // Strip trailing slash
      : `/${model.basePath}${path}`
  }

  getStartPath() {
    return getStartPath(this.model)
  }

  getSummaryPath() {
    return ControllerPath.Summary.valueOf()
  }

  getStatusPath() {
    return ControllerPath.Status.valueOf()
  }

  makeGetRouteHandler(): (
    request: FormRequest,
    context: FormContext,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>
  ) => ReturnType<Lifecycle.Method<FormRequestRefs>> {
    return (request, context, h) => {
      const { viewModel, viewName } = this
      return h.view(viewName, viewModel)
    }
  }

  makePostRouteHandler(): (
    request: FormRequestPayload,
    context: FormContext,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>
  ) => ReturnType<Lifecycle.Method<FormRequestPayloadRefs>> {
    throw Boom.badRequest('Unsupported POST route handler for this page')
  }

  private makeCondition() {
    const { condition } = this.pageDef

    if (!condition) {
      return
    }

    function createCondition(condition: PageCondition) {
      const { pageId, componentId, valueId } = condition

      const page = this.model.pageMap.get(pageId)

      if (!page) {
        throw new Error(`Page ${pageId} not found`)
      }

      const component = this.model.componentMap.get(componentId)

      if (!component) {
        throw new Error(`Component '${componentId}' not found`)
      }

      const listId = component.list
      const list = this.model.listMap.get(listId)

      if (!list) {
        throw new Error(`List '${listId}' not found`)
      }

      const item = list.items.find((item) => item.id === valueId)

      if (!item) {
        throw new Error(`Item '${valueId}' not found in list '${listId}'`)
      }

      console.log('==>', page.path, component.title, item.value)

      return { component, list, item }
    }

    const types = condition.map((clause) => {
      const term = {}

      clause.forEach((pageCondition) => {
        const { item, component } = createCondition.call(this, pageCondition)

        term[pageCondition.componentId] =
          component.type === ComponentType.CheckboxesField
            ? joi
                .array()
                .items(
                  joi.string().valid(item.value).required(),
                  joi.string().optional()
                )
                .required()
            : joi.valid(item.value).required()
      })

      return term
    })

    return joi.alternatives().try(...types)
  }
}
