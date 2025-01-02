import { randomUUID } from 'crypto'

import { type PageRepeat, type Repeat } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'
import Joi from 'joi'

import { isRepeatState } from '~/src/server/plugins/engine/components/FormComponent.js'
import { redirectPath } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import {
  type FormContext,
  type FormContextRequest,
  type FormPageViewModel,
  type FormPayload,
  type FormSubmissionState,
  type ItemDeletePageViewModel,
  type RepeatItemState,
  type RepeatListState,
  type RepeaterSummaryPageViewModel,
  type SummaryList,
  type SummaryListAction
} from '~/src/server/plugins/engine/types.js'
import {
  FormAction,
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

export class RepeatPageController extends QuestionPageController {
  declare pageDef: PageRepeat

  listSummaryViewName = 'repeat-list-summary'
  listDeleteViewName = 'item-delete'
  repeat: Repeat

  constructor(model: FormModel, pageDef: PageRepeat) {
    super(model, pageDef)

    this.repeat = pageDef.repeat

    const { options, schema } = this.repeat
    const itemId = Joi.string().uuid().required()

    this.collection.formSchema = this.collection.formSchema.append({ itemId })
    this.collection.stateSchema = Joi.object<RepeatItemState>().keys({
      [options.name]: Joi.array()
        .items(this.collection.stateSchema.append({ itemId }))
        .min(schema.min)
        .max(schema.max)
        .label(`${options.title} list`)
        .required()
    })
  }

  get keys() {
    const { repeat } = this
    return [repeat.options.name, ...super.keys]
  }

  getItemId(request?: FormContextRequest) {
    const { itemId } = this.getFormParams(request)
    return itemId ?? request?.params.itemId
  }

  getFormParams(request?: FormContextRequest) {
    const params = super.getFormParams(request)

    // Apply an itemId to the form payload
    if (request?.payload) {
      params.itemId = request.params.itemId ?? randomUUID()
    }

    return params
  }

  getFormDataFromState(
    request: FormContextRequest | undefined,
    state: FormSubmissionState
  ) {
    const { repeat } = this

    const params = this.getFormParams(request)
    const list = this.getListFromState(state)
    const itemId = this.getItemId(request)

    // Create payload with repeater list state
    if (!itemId) {
      return {
        ...params,
        [repeat.options.name]: list
      }
    }

    // Create payload with repeater item state
    const item = this.getItemFromList(list, itemId)

    return {
      ...params,
      ...item
    }
  }

  getStateFromValidForm(
    request: FormContextRequest,
    state: FormSubmissionState,
    payload: FormPayload
  ) {
    const itemId = this.getItemId(request)

    if (!itemId) {
      throw Boom.badRequest('No item ID found')
    }

    const list = this.getListFromState(state)
    const item = this.getItemFromList(list, itemId)

    const itemState = super.getStateFromValidForm(request, state, payload)
    const updated: RepeatItemState = { ...itemState, itemId }
    const newList = [...list]

    if (!item) {
      // Adding a new item
      newList.push(updated)
    } else {
      // Update an existing item
      newList[list.indexOf(item)] = updated
    }

    return {
      [this.repeat.options.name]: newList
    }
  }

  proceed(
    request: FormContextRequest,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>
  ) {
    const nextPath = this.getSummaryPath(request)
    return super.proceed(request, h, nextPath)
  }

  getItemFromList(list: RepeatListState, itemId?: string) {
    return list.find((item) => item.itemId === itemId)
  }

  getListFromState(state: FormSubmissionState) {
    const { name } = this.repeat.options
    const values = state[name]

    return isRepeatState(values) ? values : []
  }

  makeGetRouteHandler() {
    return async (
      request: FormRequest,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { path } = this
      const { query } = request
      const { state } = context

      const itemId = this.getItemId(request)
      const list = this.getListFromState(state)

      if (!itemId) {
        const summaryPath = this.getSummaryPath(request)
        const nextPath = redirectPath(`${path}/${randomUUID()}`, {
          returnUrl: query.returnUrl
        })

        // Only redirect to new item when list is empty
        return super.proceed(request, h, list.length ? summaryPath : nextPath)
      }

      return super.makeGetRouteHandler()(request, context, h)
    }
  }

  makeGetListSummaryRouteHandler() {
    return async (
      request: FormRequest,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { path } = this
      const { query } = request
      const { state } = context

      const list = this.getListFromState(state)

      if (!list.length) {
        const nextPath = redirectPath(`${path}/${randomUUID()}`, {
          returnUrl: query.returnUrl
        })

        return super.proceed(request, h, nextPath)
      }

      const { progress = [] } = await this.updateProgress(request, state)

      const viewModel = this.getListSummaryViewModel(request, context, list)
      viewModel.backLink = this.getBackLink(progress)

      return h.view(this.listSummaryViewName, viewModel)
    }
  }

  makePostListSummaryRouteHandler() {
    return (
      request: FormRequestPayload,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { path, repeat } = this
      const { query } = request
      const { schema, options } = repeat
      const { state } = context

      const list = this.getListFromState(state)

      if (!list.length) {
        const nextPath = redirectPath(`${path}/${randomUUID()}`, {
          returnUrl: query.returnUrl
        })

        return super.proceed(request, h, nextPath)
      }

      const { action } = this.getFormParams(request)

      const hasErrorMin =
        action === FormAction.Continue && list.length < schema.min

      const hasErrorMax =
        (action === FormAction.AddAnother && list.length >= schema.max) ||
        (action === FormAction.Continue && list.length > schema.max)

      // Show error if repeat limits apply
      if (hasErrorMin || hasErrorMax) {
        const count = hasErrorMax ? schema.max : schema.min
        const itemTitle = `${options.title}${count === 1 ? '' : 's'}`

        context.errors = [
          {
            path: [],
            href: '',
            name: '',
            text: hasErrorMax
              ? `You can only add up to ${count} ${itemTitle}`
              : `You must add at least ${count} ${itemTitle}`
          }
        ]

        const { progress = [] } = state

        const viewModel = this.getListSummaryViewModel(request, context, list)
        viewModel.backLink = this.getBackLink(progress)

        return h.view(this.listSummaryViewName, viewModel)
      }

      if (action === FormAction.AddAnother) {
        const nextPath = redirectPath(`${path}/${randomUUID()}`, {
          returnUrl: query.returnUrl
        })

        return super.proceed(request, h, nextPath)
      }

      const nextPath = this.getNextPath(context)
      return super.proceed(request, h, nextPath)
    }
  }

  makeGetItemDeleteRouteHandler() {
    return async (
      request: FormRequest,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { viewModel } = this
      const { state } = context

      const list = this.getListFromState(state)
      const itemId = this.getItemId(request)
      const item = this.getItemFromList(list, itemId)

      if (!item || list.length === 1) {
        throw Boom.notFound(
          item
            ? 'Last list item cannot be removed'
            : 'List item to remove not found'
        )
      }

      const { title } = this.repeat.options

      const { progress = [] } = await this.updateProgress(request, state)

      return h.view(this.listDeleteViewName, {
        ...viewModel,
        context,
        backLink: this.getBackLink(progress),
        pageTitle: `Are you sure you want to remove this ${title}?`,
        itemTitle: `${title} ${list.indexOf(item) + 1}`,
        buttonConfirm: { text: `Remove ${title}` },
        buttonCancel: { text: 'Cancel' }
      } satisfies ItemDeletePageViewModel)
    }
  }

  makePostItemDeleteRouteHandler() {
    return async (
      request: FormRequestPayload,
      context: FormContext,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { repeat } = this
      const { state } = context

      const { confirm } = this.getFormParams(request)

      const list = this.getListFromState(state)
      const itemId = this.getItemId(request)
      const item = this.getItemFromList(list, itemId)

      if (!item || list.length === 1) {
        throw Boom.notFound(
          item
            ? 'Last list item cannot be removed'
            : 'List item to remove not found'
        )
      }

      // Remove the item from the list
      if (confirm) {
        list.splice(list.indexOf(item), 1)

        const update = {
          [repeat.options.name]: list
        }

        await this.mergeState(request, state, update)
      }

      return this.proceed(request, h)
    }
  }

  getViewModel(
    request: FormContextRequest,
    context: FormContext
  ): FormPageViewModel {
    const { state } = context

    const list = this.getListFromState(state)
    const itemId = this.getItemId(request)
    const item = this.getItemFromList(list, itemId)

    const viewModel = super.getViewModel(request, context)
    const itemNumber = item ? list.indexOf(item) + 1 : list.length + 1
    const repeatCaption = `${this.repeat.options.title} ${itemNumber}`

    return {
      ...viewModel,

      sectionTitle: viewModel.sectionTitle
        ? `${viewModel.sectionTitle}: ${repeatCaption}`
        : repeatCaption
    }
  }

  getListSummaryViewModel(
    request: FormContextRequest,
    context: FormContext,
    list: RepeatListState
  ): RepeaterSummaryPageViewModel {
    const { collection, href, repeat } = this
    const { query } = request
    const { errors } = context

    const { title } = repeat.options

    const summaryList: SummaryList = {
      classes: 'govuk-summary-list--long-actions',
      rows: []
    }

    let count = 0

    if (Array.isArray(list)) {
      count = list.length

      list.forEach((item, index) => {
        const items: SummaryListAction[] = [
          {
            href: redirectPath(`${href}/${item.itemId}`, {
              returnUrl: query.returnUrl
            }),
            text: 'Change',
            classes: 'govuk-link--no-visited-state',
            visuallyHiddenText: `item ${index + 1}`
          }
        ]

        if (count > 1) {
          items.push({
            href: redirectPath(`${href}/${item.itemId}/confirm-delete`, {
              returnUrl: query.returnUrl
            }),
            text: 'Remove',
            classes: 'govuk-link--no-visited-state',
            visuallyHiddenText: `item ${index + 1}`
          })
        }

        const itemDisplayText = collection.fields.length
          ? collection.fields[0].getDisplayStringFromState(item)
          : ''

        summaryList.rows.push({
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
      ...this.viewModel,
      repeatTitle: title,
      pageTitle: `You have added ${count} ${title}${count === 1 ? '' : 's'}`,
      showTitle: true,
      context,
      errors,
      checkAnswers: [{ summaryList }]
    }
  }

  getSummaryPath(request?: FormContextRequest) {
    const { path } = this

    const summaryPath = super.getSummaryPath()

    if (!request) {
      return summaryPath
    }

    const { query } = request

    return redirectPath(`${path}${summaryPath}`, {
      itemId: this.getItemId(request),
      returnUrl: query.returnUrl
    })
  }
}
