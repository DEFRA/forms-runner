import {
  type ConditionRawData,
  type Page,
  type Section
} from '@defra/forms-model'
import { type ResponseObject } from '@hapi/hapi'

import { type ComponentCollectionViewModel } from '../components/types.js'
import { type PageControllerBase } from '../pageControllers/PageControllerBase.js'
import { type FormSubmissionErrors } from '../types.js'

import { type Component } from '~/src/server/plugins/engine/models/../components/index.js'

export type Fields = {
  key: string
  title: string
  type: string
  answer: string | number | boolean
}[]

export interface Question {
  category: string | null
  question: string
  fields: Fields
  index?: number
}

export type Questions = Question[]

export type ExecutableCondition = ConditionRawData & {
  fn: (state: any) => boolean
}

/**
 * Used to render a row on a Summary List (check your answers)
 */

export interface DetailItem {
  /**
   * Name of the component defined in the JSON {@link FormDefinition}
   */
  name: Component['name']

  /**
   * Title of the component defined in the JSON {@link FormDefinition}
   * Used as a human readable form of {@link Component.#name} and HTML content for HTML Label tag
   */
  label: Component['title']

  /**
   * Path to redirect the user to if they decide to change this value
   */
  path: Page['path']

  /**
   * String and/or display value of a field. For example, a Date will be displayed as 25 December 2022
   */
  value: string

  /**
   * Raw value of a field. For example, a Date will be displayed as 2022-12-25
   */
  rawValue: string | number | object
  url: string
  pageId: string
  type: Component['type']
  title: Component['title']
  dataType?: Component['dataType']
  items: DetailItem[]
}

/**
 * Used to render a row on a Summary List (check your answers)
 */
export interface Detail {
  name: Section['name'] | undefined
  title: Section['title'] | undefined
  items: DetailItem[]
}

export interface BaseViewModel {
  page: PageControllerBase
  name?: string
  pageTitle: string
  sectionTitle?: string
  showTitle: boolean
  components: ComponentCollectionViewModel
  errors?: FormSubmissionErrors
  isStartPage: boolean
  startPage?: ResponseObject
  backLink?: string
  serviceUrl: string
  phaseTag?: string
  feedbackLink?: string
}
