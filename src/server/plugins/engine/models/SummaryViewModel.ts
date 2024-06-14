import { type Request } from '@hapi/hapi'
import { reach } from '@hapi/hoek'
import { type ValidationResult } from 'joi'

import config from '~/src/server/config.js'
import { redirectUrl } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { SummaryPageController } from '~/src/server/plugins/engine/pageControllers/index.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import { type InitialiseSessionOptions } from '~/src/server/plugins/initialiseSession/types.js'

export class SummaryViewModel {
  /**
   * Responsible for parsing state values to the govuk-frontend summary list template
   */

  pageTitle: string
  declaration: any // TODO
  skipSummary: boolean
  endPage: any // TODO
  result: any
  details: any
  relevantPages: any[]
  state: any
  value: any
  name: string | undefined
  backLink?: string
  feedbackLink: string | undefined
  phaseTag: string | undefined
  declarationError: any // TODO
  errors:
    | {
        path: string
        name: string
        message: string
      }[]
    | undefined

  callback?: InitialiseSessionOptions
  serviceStartPage: string
  constructor(
    pageTitle: string,
    model: FormModel,
    state: FormSubmissionState,
    request: Request
  ) {
    this.pageTitle = pageTitle
    this.serviceStartPage = `/${model.basePath}`
    this.name = model.def.name
    const { relevantPages, endPage } = this.getRelevantPages(model, state)
    const details = this.summaryDetails(request, model, state, relevantPages)
    const { def } = model
    this.declaration = def.declaration
    // @ts-expect-error - Type 'boolean | undefined' is not assignable to type 'boolean'
    this.skipSummary = def.skipSummary
    this.endPage = endPage
    this.feedbackLink =
      def.feedback?.url ??
      ((def.feedback?.emailAddress && `mailto:${def.feedback.emailAddress}`) ||
        config.feedbackLink)

    const schema = model.makeFilteredSchema(state, relevantPages)
    const collatedRepeatPagesState = gatherRepeatPages(state)

    const result = schema.validate(collatedRepeatPagesState, {
      abortEarly: false,
      stripUnknown: true
    })

    if (result.error) {
      this.processErrors(result, details)
    }

    this.result = result
    this.details = details
    this.relevantPages = relevantPages
    this.state = state
    this.value = result.value
    this.callback = state.callback
  }

  private processErrors(result: ValidationResult, details) {
    this.errors = result.error.details.map((err) => {
      const name = err.path[err.path.length - 1]

      return {
        path: err.path.join('.'),
        name,
        message: err.message
      }
    })

    details.forEach((detail) => {
      const sectionErr = this.errors?.find((err) => err.path === detail.name)

      detail.items.forEach((item) => {
        if (sectionErr) {
          item.inError = true
          return
        }

        const err = this.errors?.find(
          (err) =>
            err.path ===
            (detail.name ? detail.name + '.' + item.name : item.name)
        )
        if (err) {
          item.inError = true
        }
      })
    })
  }

  private summaryDetails(
    request,
    model: FormModel,
    state: FormSubmissionState,
    relevantPages
  ) {
    const details: object[] = []

    ;[undefined, ...model.sections].forEach((section) => {
      const items: any[] = []
      let sectionState = section ? state[section.name] || {} : state

      const sectionPages = relevantPages.filter(
        (page) => page.section === section
      )

      const repeatablePage = sectionPages.find((page) => !!page.repeatField)
      // Currently can't handle repeatable page outside a section.
      // In fact currently if any page in a section is repeatable it's expected that all pages in that section will be
      // repeatable
      if (section && repeatablePage) {
        if (!state[section.name]) {
          state[section.name] = sectionState = []
        }
        // Make sure the right number of items
        const requiredIterations = reach(state, repeatablePage.repeatField)
        if (requiredIterations < sectionState.length) {
          state[section.name] = sectionState.slice(0, requiredIterations)
        } else {
          for (let i = sectionState.length; i < requiredIterations; i++) {
            sectionState.push({})
          }
        }
      }

      sectionPages.forEach((page) => {
        for (const component of page.components.formItems) {
          const item = Item(request, component, sectionState, page, model)
          if (items.find((cbItem) => cbItem.name === item.name)) return
          items.push(item)
          if (component.items) {
            const selectedValue = sectionState[component.name]
            const selectedItem = component.items.filter(
              (i) => i.value === selectedValue
            )[0]
            if (selectedItem?.childrenCollection) {
              for (const cc of selectedItem.childrenCollection.formItems) {
                const cItem = Item(request, cc, sectionState, page, model)
                items.push(cItem)
              }
            }
          }
        }
      })

      if (items.length > 0) {
        if (Array.isArray(sectionState)) {
          details.push({
            name: section?.name,
            title: section?.title,
            items: [...Array(reach(state, repeatablePage.repeatField))].map(
              (_x, i) => {
                return items.map((item) => item[i])
              }
            )
          })
        } else {
          details.push({
            name: section?.name,
            title: section?.title,
            items
          })
        }
      }
    })

    return details
  }

  private getRelevantPages(model: FormModel, state: FormSubmissionState) {
    let nextPage = model.startPage
    const relevantPages: any[] = []
    let endPage = null

    while (nextPage != null) {
      if (nextPage.hasFormComponents) {
        relevantPages.push(nextPage)
      } else if (
        !nextPage.hasNext &&
        !(nextPage instanceof SummaryPageController)
      ) {
        endPage = nextPage
      }
      nextPage = nextPage.getNextPage(state, true)
    }

    return { relevantPages, endPage }
  }
}

function gatherRepeatPages(state) {
  if (Object.values(state).find((section) => Array.isArray(section))) {
    return state
  }
  const clonedState = structuredClone(state)
  Object.entries(state).forEach(([key, section]) => {
    if (key === 'progress') {
      return
    }
    if (Array.isArray(section)) {
      clonedState[key] = section.map((pages) =>
        Object.values(pages).reduce(
          (acc: object, p: any) => ({ ...acc, ...p }),
          {}
        )
      )
    }
  })
}

/**
 * Creates an Item object for Details
 */
function Item(
  request,
  component,
  sectionState,
  page,
  model: FormModel,
  params: { num?: number; returnUrl: string } = {
    returnUrl: redirectUrl(request, `/${model.basePath}/summary`)
  }
) {
  const isRepeatable = !!page.repeatField

  // TODO:- deprecate in favour of section based and/or repeatingFieldPageController
  if (isRepeatable && Array.isArray(sectionState)) {
    return sectionState.map((state, i) => {
      const collated = Object.values(state).reduce(
        (acc: object, p: any) => ({ ...acc, ...p }),
        {}
      )
      return Item(request, component, collated, page, model, {
        ...params,
        num: i + 1
      })
    })
  }

  return {
    name: component.name,
    path: page.path,
    label: component.localisedString(component.title),
    value: component.getDisplayStringFromState(sectionState),
    rawValue: sectionState[component.name],
    url: redirectUrl(request, `/${model.basePath}${page.path}`, params),
    pageId: `/${model.basePath}${page.path}`,
    type: component.type,
    title: component.title,
    dataType: component.dataType
  }
}
