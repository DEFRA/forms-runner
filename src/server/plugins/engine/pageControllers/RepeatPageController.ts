import { randomUUID } from 'crypto'

import { type PageRepeat, type Repeat } from '@defra/forms-model'
import { badRequest, notFound } from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'
import Joi from 'joi'

import { isRepeatList } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import {
  type CheckAnswers,
  type FormContext,
  type FormContextRequest,
  type FormPageViewModel,
  type FormPayload,
  type FormSubmissionError,
  type FormSubmissionState,
  type RepeatState,
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
  listDeleteViewName = 'repeat-item-delete'
  repeat: Repeat

  constructor(model: FormModel, pageDef: PageRepeat) {
    super(model, pageDef)

    this.repeat = pageDef.repeat

    const { options, schema } = this.repeat
    const itemId = Joi.string().uuid().required()

    this.collection.formSchema = this.collection.formSchema.append({ itemId })
    this.collection.stateSchema = Joi.object<RepeatState>().keys({
      [options.name]: Joi.array()
        .items(this.collection.stateSchema.append({ itemId }))
        .min(schema.min)
        .max(schema.max)
        .label(`${options.title} list`)
        .required()
    })
  }

  get keys() {
    return [this.repeat.options.name]
  }

  getFormData(request: FormContextRequest) {
    const formData = super.getFormData(request)

    // Apply an itemId to the form payload
    formData.itemId = request.params.itemId ?? randomUUID()

    return formData
  }

  getFormDataFromState(state: FormSubmissionState) {
    const [name] = this.keys

    return {
      [name]: this.getListFromState(state)
    }
  }

  getStateFromValidForm(request: FormContextRequest, payload: FormPayload) {
    const state = super.getStateFromValidForm(request, payload)

    if (typeof payload.itemId !== 'string') {
      throw badRequest('No item ID found in the payload')
    }

    const [name] = this.keys
    const list = this.getListFromState(state)
    const item = this.getItemFromList(list, payload.itemId)

    const updated: RepeatState = { ...state, itemId: payload.itemId }
    const newList = [...list]

    if (!item) {
      // Adding a new item
      newList.push(updated)
    } else {
      // Update an existing item
      newList[list.indexOf(item)] = updated
    }

    return {
      [name]: newList
    }
  }

  proceed(
    request: FormContextRequest,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>
  ) {
    const nextPath = this.getSummaryPath(request)
    return super.proceed(request, h, nextPath)
  }

  /**
   * Get the nested state from list array from state.
   */
  getItemFromList(list: RepeatState[], itemId?: string) {
    return list.find((item) => item.itemId === itemId)
  }

  /**
   * Get the repeat list array from state.
   */
  getListFromState(state: FormSubmissionState) {
    const [name] = this.keys
    const values = state[name]

    return isRepeatList(values) ? values : []
  }

  makeGetRouteHandler() {
    return async (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { path } = this

      if (!request.params.itemId) {
        const nextPath = `${path}/${randomUUID()}${request.url.search}`
        return super.proceed(request, h, nextPath)
      }

      return super.makeGetRouteHandler()(request, h)
    }
  }

  makeGetListSummaryRouteHandler() {
    return async (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { model, path } = this

      const state = await this.getState(request)
      const context = model.getFormContext(request, state)
      const relevantPath = this.getRelevantPath(context)

      // Redirect back to last relevant page
      if (relevantPath !== path) {
        return super.proceed(request, h, relevantPath)
      }

      const viewModel = this.getListSummaryViewModel(request, context)

      const { progress = [] } = await this.updateProgress(request, state)

      viewModel.backLink = this.getBackLink(progress)

      return h.view(this.listSummaryViewName, viewModel)
    }
  }

  makePostListSummaryRouteHandler() {
    return async (
      request: FormRequestPayload,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { model, path, repeat } = this

      const state = await this.getState(request)
      const context = model.getFormContext(request, state)
      const relevantPath = this.getRelevantPath(context)

      // Redirect back to last relevant page
      if (relevantPath !== path) {
        return super.proceed(request, h, relevantPath)
      }

      const { action } = this.getFormData(request)

      if (action === FormAction.AddAnother) {
        const list = this.getListFromState(state)
        const { schema, options } = repeat

        // Show error if repeat max limit reached
        if (list.length >= schema.max) {
          context.errors = [
            {
              path: [],
              href: '',
              name: '',
              text: `You can only add up to ${schema.max} ${options.title}${schema.max === 1 ? '' : 's'}`
            }
          ]

          const viewModel = this.getListSummaryViewModel(request, context)

          return h.view(this.listSummaryViewName, viewModel)
        }

        return super.proceed(request, h, `${path}${request.url.search}`)
      } else if (action === FormAction.Continue) {
        return super.proceed(
          request,
          h,

          // This is required to ensure we don't navigate
          // to an incorrect page based on stale state values
          this.getNextPath(model.getFormContext(request, state))
        )
      }
    }
  }

  makeGetListDeleteRouteHandler() {
    return async (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { model, path } = this

      const { itemId } = this.getFormData(request)

      const state = await this.getState(request)
      const list = this.getListFromState(state)
      const item = this.getItemFromList(list, itemId)

      if (!item) {
        return notFound('List item to delete not found')
      }

      const index = list.indexOf(item)
      const context = model.getFormContext(request, state)
      const relevantPath = this.getRelevantPath(context)

      // Redirect back to last relevant page
      if (relevantPath !== path) {
        return super.proceed(request, h, relevantPath)
      }

      return h.view(this.listDeleteViewName, {
        field: {
          name: 'confirm',
          fieldset: {
            legend: {
              text: `Are you sure you want to remove ${this.repeat.options.title} ${index + 1} from this form?`,
              isPageHeading: true,
              classes: 'govuk-fieldset__legend--l'
            }
          },
          items: [
            {
              value: true,
              text: `Yes, remove ${this.repeat.options.title} ${index + 1}`
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
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { model, path } = this

      const state = await this.getState(request)
      const context = model.getFormContext(request, state)
      const relevantPath = this.getRelevantPath(context)

      // Redirect back to last relevant page
      if (relevantPath !== path) {
        return super.proceed(request, h, relevantPath)
      }

      const { confirm, itemId } = this.getFormData(request)

      if (confirm === true) {
        const [name] = this.keys
        const list = this.getListFromState(state)
        const item = this.getItemFromList(list, itemId)

        if (item) {
          // Remove the item from the list
          list.splice(list.indexOf(item), 1)

          await this.mergeState(request, state, {
            [name]: list
          })
        }
      }

      return this.proceed(request, h)
    }
  }

  getViewModel(
    request: FormContextRequest,
    context: FormContext
  ): FormPageViewModel {
    const viewModel = super.getViewModel(request, context)

    const { state, payload } = context

    const list = this.getListFromState(state)
    const item = this.getItemFromList(list, payload.itemId)

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
    context: FormContext
  ): {
    name: string | undefined
    pageTitle: string
    sectionTitle: string | undefined
    showTitle: boolean
    serviceUrl: string
    context: FormContext
    errors?: FormSubmissionError[]
    checkAnswers: CheckAnswers[]
    repeatTitle: string
    backLink?: string
  } {
    const { collection, href, repeat, section } = this
    const { errors, state } = context

    const list = this.getListFromState(state)

    const { title } = repeat.options
    const sectionTitle = section?.hideTitle !== true ? section?.title : ''

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
            href: `${href}/${item.itemId}${request.url.search}`,
            text: 'Change',
            classes: 'govuk-link--no-visited-state',
            visuallyHiddenText: `item ${index + 1}`
          }
        ]

        if (count > 1) {
          items.push({
            href: `${href}/${item.itemId}/confirm-delete${request.url.search}`,
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
      name: this.name,
      pageTitle: `You have added ${count} ${title}${count === 1 ? '' : 's'}`,
      sectionTitle,
      showTitle: true,
      context,
      errors,
      serviceUrl: this.getHref('/'),
      checkAnswers: [{ summaryList }],
      repeatTitle: title
    }
  }

  getSummaryPath(request?: FormContextRequest) {
    const { path } = this

    const summaryPath = super.getSummaryPath()

    if (!request) {
      return summaryPath
    }

    const { params, url } = request
    const newUrl = new URL(url)

    if (params.itemId) {
      newUrl.searchParams.set('itemId', params.itemId)
    } else {
      newUrl.searchParams.delete('itemId')
    }

    return `${path}${summaryPath}${newUrl.search}`
  }
}
