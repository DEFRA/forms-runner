import {
  type ConditionWrapper,
  type FormDefinition,
  type Section
} from '@defra/forms-model'
import { type Expression } from 'expr-eval'

import { type ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type FeedbackContextInfo } from '~/src/server/plugins/engine/feedback/index.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import { type Field } from '~/src/server/schemas/types.js'

export type Fields = Field[]

export interface Question {
  category: string | null
  question: string
  fields: Fields
  index?: number
}

export type Questions = Question[]

interface FeedbackContextItem {
  key:
    | 'feedbackContextInfo_formTitle'
    | 'feedbackContextInfo_pageTitle'
    | 'feedbackContextInfo_url'
  display: string
  get: (contextInfo: FeedbackContextInfo) => string
}

export const FEEDBACK_CONTEXT_ITEMS: readonly FeedbackContextItem[] = [
  {
    key: 'feedbackContextInfo_formTitle',
    display: 'Feedback source form name',
    get: (contextInfo) => contextInfo.formTitle
  },
  {
    key: 'feedbackContextInfo_pageTitle',
    display: 'Feedback source page title',
    get: (contextInfo) => contextInfo.pageTitle
  },
  {
    key: 'feedbackContextInfo_url',
    display: 'Feedback source url',
    get: (contextInfo) => contextInfo.url
  }
]

export type ExecutableCondition = ConditionWrapper & {
  expr: Expression
  fn: (state: FormSubmissionState) => boolean
}

/**
 * Used to render a row on a Summary List (check your answers)
 */

export interface DetailItem {
  /**
   * Name of the component defined in the JSON {@link FormDefinition}
   */
  name: ComponentBase['name']

  /**
   * Title of the component defined in the JSON {@link FormDefinition}
   * Used as a human readable form of {@link ComponentBase.name} and HTML content for HTML Label tag
   */
  label: ComponentBase['title']

  /**
   * Path to redirect the user to if they decide to change this value
   */
  path: PageControllerClass['path']

  /**
   * String and/or display value of a field. For example, a Date will be displayed as 25 December 2022
   */
  value: string

  /**
   * Raw value of a field. For example, a Date will be displayed as 2022-12-25
   */
  rawValue: string | number | boolean
  url: string
  pageId: string
  type: ComponentBase['type']
  title: ComponentBase['title']
  dataType: ComponentBase['dataType']
  items?: DetailItem[]
  inError?: boolean
}

/**
 * Used to render a row on a Summary List (check your answers)
 */
export interface Detail {
  name?: Section['name']
  title?: Section['title']
  items: DetailItem[]
}
