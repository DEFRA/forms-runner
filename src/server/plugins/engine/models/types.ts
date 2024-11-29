import {
  type ConditionWrapper,
  type FormComponentsDef,
  type Section
} from '@defra/forms-model'
import { type Expression } from 'expr-eval'

import {
  type Field,
  type getAnswer
} from '~/src/server/plugins/engine/components/helpers.js'
import { type RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FormState,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'

export type ExecutableCondition = ConditionWrapper & {
  expr: Expression
  fn: (evaluationState: FormState) => boolean
}

/**
 * Used to render a row on a Summary List (check your answers)
 */
export interface DetailItemBase {
  /**
   * Name of the component defined in the JSON
   * @see {@link FormComponentsDef.name}
   */
  name: string

  /**
   * Field label, used for change link visually hidden text
   * @see {@link FormComponentsDef.title}
   */
  label: string

  /**
   * Field change link
   */
  href: string

  /**
   * Form submission state (or repeat state for sub items)
   */
  state: FormState

  /**
   * Field submission state error, used to flag unanswered questions
   * Shown as 'Complete all unanswered questions before submitting the form'
   */
  error?: FormSubmissionError
}

export interface DetailItemField extends DetailItemBase {
  /**
   * Field page controller instance
   */
  page: Exclude<PageControllerClass, RepeatPageController>

  /**
   * Check answers summary list key
   * For example, 'Date of birth'
   */
  title: string

  /**
   * Check answers summary list value, formatted by {@link getAnswer}
   * For example, date fields formatted as '25 December 2022'
   */
  value: string

  /**
   * Field component instance
   */
  field: Field
}

export interface DetailItemRepeat extends DetailItemBase {
  /**
   * Repeat page controller instance
   */
  page: RepeatPageController

  /**
   * Check answers summary list key
   * For example, 'Pizza' or 'Pizza added'
   */
  title: string

  /**
   * Check answers summary list value
   * For example, 'You added 2 Pizzas'
   */
  value: string

  /**
   * Repeater field detail items
   */
  subItems: DetailItemField[][]
}

export type DetailItem = DetailItemField | DetailItemRepeat

/**
 * Used to render a row on a Summary List (check your answers)
 */
export interface Detail {
  name?: Section['name']
  title?: Section['title']
  items: DetailItem[]
}
