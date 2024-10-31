import {
  type ConditionWrapper,
  type DatePartsFieldComponent,
  type FileUploadFieldComponent,
  type FormComponentsDef,
  type FormDefinition,
  type InputFieldsComponentsDef,
  type Item,
  type MonthYearFieldComponent,
  type NumberFieldComponent,
  type Section,
  type SelectionComponentsDef
} from '@defra/forms-model'
import { type Expression } from 'expr-eval'

import { type ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { type DataType } from '~/src/server/plugins/engine/components/types.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FileState,
  type FormState,
  type FormStateValue,
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
   * Name of the component defined in the JSON {@link FormDefinition}
   */
  name: ComponentBase['name']

  /**
   * Title of the component defined in the JSON {@link FormDefinition}
   * Used as a human readable form of {@link ComponentBase.name} and HTML content for HTML Label tag
   */
  label: ComponentBase['title']

  /**
   * Path to page excluding base path
   */
  path: PageControllerClass['path']

  /**
   * String and/or display value of a field. For example, a Date will be displayed as 25 December 2022
   */
  value: string

  /**
   * Flag to indicate if field is in error and should be changed
   */
  inError?: boolean

  /**
   * Raw value of a field. For example, a Date will be displayed as 2022-12-25
   */
  rawValue: FormState | FormStateValue

  url: string
  type?: FormComponentsDef['type']
  title: string
  dataType?: DataType
  subItems?: DetailItem[][]
}

export interface DetailItemDate extends DetailItemBase {
  type: DatePartsFieldComponent['type']
  dataType: DataType.Date
  rawValue: FormState | null
}

export interface DetailItemMonthYear extends DetailItemBase {
  type: MonthYearFieldComponent['type']
  dataType: DataType.MonthYear
  rawValue: FormState | null
}

export interface DetailItemSelection extends DetailItemBase {
  type: SelectionComponentsDef['type']
  dataType: DataType.List
  items: DetailItem[]
  rawValue: Item['value'] | Item['value'][] | null
}

export interface DetailItemNumber extends DetailItemBase {
  type: NumberFieldComponent['type']
  dataType: DataType.Number
  rawValue: number | null
}

export interface DetailItemText extends DetailItemBase {
  type: Exclude<
    InputFieldsComponentsDef,
    NumberFieldComponent | FileUploadFieldComponent
  >['type']
  dataType: DataType.Text
  rawValue: string | null
}

export interface DetailItemFileUpload extends DetailItemBase {
  type: FileUploadFieldComponent['type']
  dataType: DataType.File
  rawValue: FileState[] | null
}

export interface DetailItemRepeat extends DetailItemBase {
  rawValue: RepeatState[] | null
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
