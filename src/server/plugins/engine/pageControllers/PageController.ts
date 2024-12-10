import {
  ControllerPath,
  type FormDefinition,
  type Page,
  type Section
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type Lifecycle, type ResponseToolkit } from '@hapi/hapi'

import { config } from '~/src/config/index.js'
import { type ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  encodeUrl,
  getStartPath,
  normalisePath
} from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionError,
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
  model: FormModel
  pageDef: Page
  path: string
  title: string
  section?: Section
  collection?: ComponentCollection
  viewName = 'index'

  constructor(model: FormModel, pageDef: Page) {
    const { def } = model

    this.def = def
    this.name = def.name
    this.model = model
    this.pageDef = pageDef
    this.path = pageDef.path
    this.title = pageDef.title

    // Resolve section
    this.section = model.sections.find(
      (section) => section.name === pageDef.section
    )
  }

  get keys() {
    return this.collection?.keys ?? []
  }

  get href() {
    const { model, path } = this
    return `/${model.basePath}/${normalisePath(path)}`
  }

  get feedbackLink() {
    const { def } = this

    // setting the feedbackLink to undefined here for feedback forms prevents the feedback link from being shown
    let feedbackLink = def.feedback?.emailAddress
      ? `mailto:${def.feedback.emailAddress}`
      : def.feedback?.url

    if (!feedbackLink) {
      feedbackLink = config.get('feedbackLink')
    }

    return encodeUrl(feedbackLink)
  }

  get phaseTag() {
    const { def } = this
    return def.phaseBanner?.phase ?? config.get('phaseTag')
  }

  getStartPath() {
    return getStartPath(this.model)
  }

  getSummaryPath() {
    const { model } = this
    return `/${model.basePath}${ControllerPath.Summary}`
  }

  getViewModel(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request: FormRequest | FormRequestPayload,

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    payload: FormPayload,

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    errors?: FormSubmissionError[]
  ): PageViewModelBase {
    const { model, name, section, title } = this

    const showTitle = true
    const pageTitle = title
    const sectionTitle = section?.hideTitle !== true ? section?.title : ''

    return {
      name,
      page: this,
      pageTitle,
      sectionTitle,
      showTitle,
      isStartPage: false,
      serviceUrl: `/${model.basePath}`,
      feedbackLink: this.feedbackLink,
      phaseTag: this.phaseTag
    }
  }

  makeGetRouteHandler(): (
    request: FormRequest,
    h: ResponseToolkit<FormRequestRefs>
  ) => ReturnType<Lifecycle.Method<FormRequestRefs>> {
    return (request, h) => {
      const { viewName } = this
      const viewModel = this.getViewModel(request, {})
      return h.view(viewName, viewModel)
    }
  }

  makePostRouteHandler(): (
    request: FormRequestPayload,
    h: ResponseToolkit<FormRequestPayloadRefs>
  ) => ReturnType<Lifecycle.Method<FormRequestPayloadRefs>> {
    throw Boom.badRequest('Unsupported POST route handler for this page')
  }
}
