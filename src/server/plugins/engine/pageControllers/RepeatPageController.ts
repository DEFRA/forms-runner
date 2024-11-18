import { randomUUID } from 'crypto'

import { ControllerType, type Page, type Repeat } from '@defra/forms-model'
import { badImplementation, badRequest, notFound } from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { ADD_ANOTHER, CONTINUE } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import {
  type FormPayload,
  type FormSubmissionError,
  type FormSubmissionState,
  type PageViewModel,
  type RepeatState
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'

interface RowAction {
  href: string
  text: string
  classes: string
  visuallyHiddenText: string
}

interface Row {
  key: { text: string }
  value: { text: string }
  actions: { items: RowAction[] }
}

export class RepeatPageController extends PageController {
  listSummaryViewName = 'repeat-list-summary'
  listDeleteViewName = 'repeat-item-delete'
  repeat: Repeat

  constructor(model: FormModel, pageDef: Page) {
    super(model, pageDef)

    if (pageDef.controller !== ControllerType.Repeat) {
      throw badImplementation('Invalid controller for Repeat page')
    }

    this.repeat = pageDef.repeat

    const { options, schema } = this.repeat
    const itemId = Joi.string().uuid().required()

    this.components.formSchema = this.components.formSchema.append({ itemId })
    this.components.stateSchema = Joi.object<RepeatState>().keys({
      [options.name]: Joi.array()
        .items(this.components.stateSchema.append({ itemId }))
        .min(schema.min)
        .max(schema.max)
        .label(`${options.title} list`)
        .required()
    })
  }

  protected getPayload(request: FormRequestPayload) {
    const payload = super.getPayload(request)

    // Apply an itemId to the form payload
    payload.itemId = request.params.itemId ?? randomUUID()

    return payload
  }

  getStateFromValidForm(
    request: FormRequestPayload,
    payload: FormRequestPayload['payload']
  ) {
    const { item, list } = this.getRepeatAppData(request)
    const state = super.getStateFromValidForm(request, payload)

    if (!payload.itemId) {
      throw badRequest('No item ID found in the payload')
    }

    const updated: RepeatState = { ...state, itemId: payload.itemId }
    const newList = [...list]

    if (!item) {
      // Adding a new item
      newList.push(updated)
    } else {
      // Update an existing item
      newList[item.index] = updated
    }

    return {
      [this.repeat.options.name]: newList
    }
  }

  async getState(request: FormRequest) {
    const state = await super.getState(request)
    const { item } = this.getRepeatAppData(request)

    // When editing an existing item, get the item from
    // the array list and set its values onto the state
    if (item) {
      return { ...state, ...item.value }
    }

    return state
  }

  proceed(request: FormRequest, h: ResponseToolkit<FormRequestRefs>) {
    return h.redirect(this.getSummaryPath(request))
  }

  /**
   * Gets the repeat data from `request.app`
   * @param request - the hapi request
   */
  private getRepeatAppData(request: FormRequest | FormRequestPayload) {
    const repeat = request.app.repeat

    if (!repeat) {
      throw badRequest('No repeat data found on the request')
    }

    return repeat
  }

  /**
   * Get the repeat list array from state and add it to `request.app`.
   * If editing an existing item, the item and index will also be added.
   * @param request - the hapi request
   */
  private async setRepeatAppData(request: FormRequest | FormRequestPayload) {
    const list = await this.getList(request)
    const { itemId } = request.params
    const itemIndex = list.findIndex((item) => item.itemId === itemId)

    request.app.repeat = {
      list,
      item:
        itemIndex > -1
          ? { value: list[itemIndex], index: itemIndex }
          : undefined
    }

    return request.app.repeat
  }

  private async getList(request: FormRequest | FormRequestPayload) {
    const { cacheService } = request.services([])
    const state = await cacheService.getState(request)

    return this.getListFromState(state)
  }

  getListFromState(state: FormSubmissionState) {
    const { name } = this.repeat.options
    const values = state[name]

    if (!Array.isArray(values)) {
      return []
    }

    return values.filter(
      (value) => typeof value === 'object' && 'itemId' in value
    )
  }

  makeGetRouteHandler() {
    return async (
      request: FormRequest,
      h: ResponseToolkit<FormRequestRefs>
    ) => {
      if (!request.params.itemId) {
        return h
          .redirect(`${request.path}/${randomUUID()}${request.url.search}`)
          .code(StatusCodes.SEE_OTHER)
      }

      await this.setRepeatAppData(request)

      return super.makeGetRouteHandler()(request, h)
    }
  }

  makePostRouteHandler() {
    return async (
      request: FormRequestPayload,
      h: ResponseToolkit<FormRequestPayloadRefs>
    ) => {
      await this.setRepeatAppData(request)

      return super.makePostRouteHandler()(request, h)
    }
  }

  makeGetListSummaryRouteHandler() {
    return async (
      request: FormRequest,
      h: ResponseToolkit<FormRequestRefs>
    ) => {
      const { cacheService } = request.services([])
      const state = await super.getState(request)
      const list = this.getListFromState(state)
      const progress = state.progress ?? []

      await this.updateProgress(progress, request, cacheService)

      const viewModel = this.getListSummaryViewModel(request, list)
      viewModel.backLink = this.getBackLink(progress)

      return h.view(this.listSummaryViewName, viewModel)
    }
  }

  makePostListSummaryRouteHandler() {
    return async (
      request: FormRequestPayload,
      h: ResponseToolkit<FormRequestPayloadRefs>
    ) => {
      const { payload } = request
      const { action } = payload
      const state = await super.getState(request)

      if (action === ADD_ANOTHER) {
        const list = this.getListFromState(state)
        const { schema, options } = this.repeat

        // Show error if repeat max limit reached
        if (list.length >= schema.max) {
          const errors: FormSubmissionError[] = [
            {
              path: [],
              href: '',
              name: '',
              text: `You can only add up to ${schema.max} ${options.title}${schema.max === 1 ? '' : 's'}`
            }
          ]

          const viewModel = this.getListSummaryViewModel(request, list, errors)

          return h.view(this.listSummaryViewName, viewModel)
        }

        return h.redirect(
          `/${this.model.basePath}${this.path}${request.url.search}`
        )
      } else if (action === CONTINUE) {
        const relevantState = this.getConditionEvaluationContext(
          this.model,
          state
        )

        return super.proceed(request, h, relevantState)
      }
    }
  }

  makeGetListDeleteRouteHandler() {
    return async (
      request: FormRequest,
      h: ResponseToolkit<FormRequestRefs>
    ) => {
      const { item } = await this.setRepeatAppData(request)

      if (!item) {
        return notFound('List item to delete not found')
      }

      return h.view(this.listDeleteViewName, {
        field: {
          name: 'confirm',
          fieldset: {
            legend: {
              text: `Are you sure you want to remove ${this.repeat.options.title} ${item.index + 1} from this form?`,
              isPageHeading: true,
              classes: 'govuk-fieldset__legend--l'
            }
          },
          items: [
            {
              value: true,
              text: `Yes, remove ${this.repeat.options.title} ${item.index + 1}`
            },
            {
              value: false,
              text: 'No'
            }
          ]
        }
      })
    }
  }

  makePostListDeleteRouteHandler() {
    return async (
      request: FormRequestPayload,
      h: ResponseToolkit<FormRequestPayloadRefs>
    ) => {
      const { payload } = request
      const { confirm } = payload

      if (confirm === true) {
        const { item, list } = await this.setRepeatAppData(request)

        if (item) {
          const { cacheService } = request.services([])

          // Remove the item from the list
          list.splice(item.index, 1)

          const update = {
            [this.repeat.options.name]: list
          }

          await cacheService.mergeState(request, update)
        }
      }

      return h.redirect(this.getSummaryPath(request))
    }
  }

  getViewModel(
    request: FormRequest | FormRequestPayload,
    payload: FormPayload,
    errors?: FormSubmissionError[]
  ): PageViewModel {
    const viewModel = super.getViewModel(request, payload, errors)
    const { list, item } = this.getRepeatAppData(request)
    const itemNumber = item ? item.index + 1 : list.length + 1
    const repeatCaption = `${this.repeat.options.title} ${itemNumber}`

    viewModel.sectionTitle = viewModel.sectionTitle
      ? `${viewModel.sectionTitle}: ${repeatCaption}`
      : repeatCaption

    return viewModel
  }

  getListSummaryViewModel(
    request: FormRequest | FormRequestPayload,
    state: RepeatState[],
    errors?: FormSubmissionError[]
  ): {
    name: string | undefined
    pageTitle: string
    sectionTitle: string | undefined
    showTitle: boolean
    serviceUrl: string
    errors?: FormSubmissionError[]
    rows: Row[]
    repeatTitle: string
    backLink?: string
  } {
    const { section, model } = this
    const { title } = this.repeat.options
    const sectionTitle = section?.hideTitle !== true ? section?.title : ''
    const serviceUrl = `/${model.basePath}`
    const firstQuestion = this.components.formItems.at(0)
    const rows: Row[] = []
    let count = 0

    if (Array.isArray(state)) {
      count = state.length

      state.forEach((item, index) => {
        const items: RowAction[] = [
          {
            href: `/${model.basePath}${this.path}/${item.itemId}${request.url.search}`,
            text: 'Change',
            classes: 'govuk-link--no-visited-state',
            visuallyHiddenText: `edit item ${index + 1}`
          }
        ]

        if (count > 1) {
          items.push({
            href: `/${model.basePath}${this.path}/${item.itemId}/confirm-delete${request.url.search}`,
            text: 'Remove',
            classes: 'govuk-link--no-visited-state',
            visuallyHiddenText: `remove item ${index + 1}`
          })
        }

        const itemDisplayText: string = firstQuestion
          ? firstQuestion.getDisplayStringFromState(item)
          : ''

        rows.push({
          key: {
            text: `${title} ${index + 1}`
          },
          value: {
            text: itemDisplayText || 'Not supplied'
          },
          actions: {
            items
          }
        })
      })
    }

    return {
      name: this.name,
      pageTitle: `You have added ${count} ${title}${count === 1 ? '' : 's'}`,
      sectionTitle,
      showTitle: true,
      errors,
      serviceUrl,
      rows,
      repeatTitle: title
    }
  }

  getSummaryPath(request: FormRequest | FormRequestPayload) {
    const url = request.url
    const newUrl = new URL(url)

    if (request.params.itemId) {
      newUrl.searchParams.set('itemId', request.params.itemId)
    } else {
      newUrl.searchParams.delete('itemId')
    }

    return `/${this.model.basePath}${this.path}/summary${newUrl.search}`
  }
}
