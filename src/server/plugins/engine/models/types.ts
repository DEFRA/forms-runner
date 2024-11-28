import {
  type ConditionWrapper,
  type DatePartsFieldComponent,
  type FileUploadFieldComponent,
  type FormComponentsDef,
  type InputFieldsComponentsDef,
  type MonthYearFieldComponent,
  type NumberFieldComponent,
  type Section,
  type SelectionComponentsDef
} from '@defra/forms-model'
import { type Expression } from 'expr-eval'

import {
  type Field,
  type getAnswer
} from '~/src/server/plugins/engine/components/helpers.js'
import { type DataType } from '~/src/server/plugins/engine/components/types.js'
import { type RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FormState,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export type ExecutableCondition = ConditionWrapper & {
  expr: Expression
  fn: (state: FormSubmissionState) => boolean
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
   * Form submission state (or repeat state for sub items)
   */
  state: FormState

  /**
   * Field submission state error, used to flag unanswered questions
   * Shown as 'Complete all unanswered questions before submitting the form'
   */
  error?: FormSubmissionError

  /**
   * Field component instance
   */
  field?: Field

  type?: FormComponentsDef['type']
  dataType?: DataType
}

export interface DetailItemDate extends DetailItemField {
  type: DatePartsFieldComponent['type']
  dataType: DataType.Date
}

export interface DetailItemMonthYear extends DetailItemField {
  type: MonthYearFieldComponent['type']
  dataType: DataType.MonthYear
}

export interface DetailItemSelection extends DetailItemField {
  type: SelectionComponentsDef['type']
  dataType: DataType.List
  items: DetailItem[]
}

export interface DetailItemNumber extends DetailItemField {
  type: NumberFieldComponent['type']
  dataType: DataType.Number
}

export interface DetailItemText extends DetailItemField {
  type: Exclude<
    InputFieldsComponentsDef,
    NumberFieldComponent | FileUploadFieldComponent
  >['type']
  dataType: DataType.Text
}

export interface DetailItemFileUpload extends DetailItemField {
  type: FileUploadFieldComponent['type']
  dataType: DataType.File
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
  subItems: DetailItem[][]
}

export type DetailItem =
  | DetailItemDate
  | DetailItemMonthYear
  | DetailItemSelection
  | DetailItemNumber
  | DetailItemText
  | DetailItemFileUpload
  | DetailItemRepeat

/**
 * Used to render a row on a Summary List (check your answers)
 */
export interface Detail {
  name?: Section['name']
  title?: Section['title']
  items: DetailItem[]
}
