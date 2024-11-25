import {
  type ConditionWrapper,
  type DatePartsFieldComponent,
  type FileUploadFieldComponent,
  type FormComponentsDef,
  type InputFieldsComponentsDef,
  type Item,
  type MonthYearFieldComponent,
  type NumberFieldComponent,
  type Section,
  type SelectionComponentsDef
} from '@defra/forms-model'
import { type Expression } from 'expr-eval'

import { type Field } from '~/src/server/plugins/engine/components/helpers.js'
import { type DataType } from '~/src/server/plugins/engine/components/types.js'
import { type RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FileState,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState,
  type RepeatState
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
   * Field submission state error, used to flag unanswered questions
   * Shown as 'Complete all unanswered questions before submitting the form'
   */
  error?: FormSubmissionError

  /**
   * Raw value of a field. For example, a Date will be displayed as 2022-12-25
   */
  rawValue: FormState | FormStateValue

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
  rawValue: FormState | null
}

export interface DetailItemMonthYear extends DetailItemField {
  type: MonthYearFieldComponent['type']
  dataType: DataType.MonthYear
  rawValue: FormState | null
}

export interface DetailItemSelection extends DetailItemField {
  type: SelectionComponentsDef['type']
  dataType: DataType.List
  items: DetailItem[]
  rawValue: Item['value'] | Item['value'][] | null
}

export interface DetailItemNumber extends DetailItemField {
  type: NumberFieldComponent['type']
  dataType: DataType.Number
  rawValue: number | null
}

export interface DetailItemText extends DetailItemField {
  type: Exclude<
    InputFieldsComponentsDef,
    NumberFieldComponent | FileUploadFieldComponent
  >['type']
  dataType: DataType.Text
  rawValue: string | null
}

export interface DetailItemFileUpload extends DetailItemField {
  type: FileUploadFieldComponent['type']
  dataType: DataType.File
  rawValue: FileState[] | null
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
   * Check answers summary list value
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
  rawValue: RepeatState[] | null
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
