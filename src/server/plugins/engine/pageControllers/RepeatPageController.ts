import { randomUUID } from 'crypto'

import { ControllerType, type Page, type Repeat } from '@defra/forms-model'
import { badRequest, notFound } from '@hapi/boom'
import { type Request, type ResponseToolkit } from '@hapi/hapi'
import Joi from 'joi'

import { ADD_ANOTHER, CONTINUE } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import {
  type FormSubmissionState,
  type FormPayload,
  type FormSubmissionErrors,
  type PageViewModel
} from '~/src/server/plugins/engine/types.js'

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
      throw new Error('Invalid controller for Repeat page')
    }

    this.repeat = pageDef.repeat

    const { options, schema } = this.repeat

    this.formSchema = this.formSchema.append({
      itemId: Joi.string().uuid().required()
    })
    this.stateSchema = Joi.object<FormSubmissionState>().keys({
      [options.name]: Joi.array()
        .items(this.stateSchema.append({ itemId: Joi.string().required() }))
        .min(schema.min)
        .max(schema.max)
        .label(`${options.title} list`)
        .required()
    })
  }

  protected getPayload(request: Request) {
    const payload = super.getPayload(request)
    const { item } = this.getRepeatAppData(request)

    // Apply an itemId to the form payload
    payload.itemId = item ? item.value.itemId : randomUUID()

    return payload
  }

  getStateFromValidForm(request: Request, payload: FormPayload) {
    const { item, list } = this.getRepeatAppData(request)
    const state = super.getStateFromValidForm(request, payload)
    const updated = { ...state, itemId: payload.itemId }
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

  async getState(request: Request) {
    const state = await super.getState(request)
    const { item } = this.getRepeatAppData(request)

    // When editing an existing item, get the item from
    // the array list and set its values onto the state
    if (item) {
      if (this.section) {
        const sectionState = state[this.section.name]
        state[this.section.name] = { ...sectionState, ...item.value }

        return state
      } else {
        return { ...state, ...item.value }
      }
    }

    return state
  }

  proceed(request: Request, h: ResponseToolkit) {
    return h.redirect(this.getSummaryPath(request))
  }

  /**
   * Gets the repeat data from `request.app`
   * @param request - the hapi request
   */
  private getRepeatAppData(request: Request) {
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
  private async setRepeatAppData(request: Request) {
    const list = await this.getList(request)
    const { itemId } = request.params
    const itemIndex = itemId
      ? list.findIndex((item) => item.itemId === itemId)
      : -1

    request.app.repeat = {
      list,
      item:
        itemIndex > -1
          ? { value: list[itemIndex], index: itemIndex }
          : undefined
    }

    return request.app.repeat
  }

  private async getList(request: Request) {
    const { cacheService } = request.services([])
    const state = await cacheService.getState(request)

    return this.getListFromState(state)
  }

  private getListFromState(state: FormSubmissionState) {
    const pageState = this.section ? (state[this.section.name] ?? {}) : state
    const listState = pageState[this.repeat.options.name]

    return Array.isArray(listState) ? listState : []
  }

  makeGetRouteHandler() {
    return async (request: Request, h: ResponseToolkit) => {
      await this.setRepeatAppData(request)

      return super.makeGetRouteHandler()(request, h)
    }
  }

  makePostRouteHandler() {
    return async (request: Request, h: ResponseToolkit) => {
      await this.setRepeatAppData(request)

      return super.makePostRouteHandler()(request, h)
    }
  }

  makeGetListSummaryRouteHandler() {
    return async (request: Request, h: ResponseToolkit) => {
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
    return async (request: Request, h: ResponseToolkit) => {
      const { payload } = request
      const { action } = payload
      const state = await super.getState(request)

      if (action === ADD_ANOTHER) {
        const list = this.getListFromState(state)
        const { schema, options } = this.repeat

        // Show error if repeat max limit reached
        if (list.length >= schema.max) {
          const errors = {
            titleText: this.errorSummaryTitle,
            errorList: [
              {
                path: '',
                href: '',
                name: '',
                text: `You can only add up to ${schema.max} ${options.title}${schema.max === 1 ? '' : 's'}`
              }
            ]
          }
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
    return async (request: Request, h: ResponseToolkit) => {
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
    return async (request: Request, h: ResponseToolkit) => {
      const { payload } = request
      const { confirm } = payload

      if (confirm === true) {
        const { item, list } = await this.setRepeatAppData(request)

        if (item) {
          const { cacheService } = request.services([])

          // Remove the item from the list
          list.splice(item.index, 1)

          const update = this.getPartialMergeState({
            [this.repeat.options.name]: list
          })

          await cacheService.mergeState(request, update)
        }
      }

      return h.redirect(this.getSummaryPath(request))
    }
  }

  getViewModel(
    request: Request,
    payload: FormPayload,
    errors?: FormSubmissionErrors
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
    request: Request,
    state: FormSubmissionState,
    errors?: FormSubmissionErrors
  ): {
    name: string | undefined
    pageTitle: string
    sectionTitle: string | undefined
    showTitle: boolean
    serviceUrl: string
    errors?: FormSubmissionErrors
    rows: Row[]
    repeatTitle: string
    backLink?: string
  } {
    const { section, model } = this
    const { title } = this.repeat.options
    const sectionTitle = section?.hideTitle !== true ? section?.title : ''
    const serviceUrl = `/${model.basePath}`
    const firstQuestionId = this.components.formItems.at(0)?.name
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

        rows.push({
          key: {
            text: `${title} ${index + 1}`
          },
          value: {
            text: firstQuestionId ? item[firstQuestionId] : ''
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

  getSummaryPath(request: Request) {
    return `/${this.model.basePath}${this.path}/summary${request.url.search}`
  }
}
