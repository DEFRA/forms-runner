import { type ComponentType, type Item } from '@defra/forms-model'

import {
  type FormSubmissionError,
  type FormValue
} from '~/src/server/plugins/engine/types.js'

export interface Label {
  text: string
  classes?: string
  html?: string
  isPageHeading?: boolean
}

export interface Content {
  title?: string
  text: string
  condition?: string
}

export type ListItemLabel = Omit<Label, 'text' | 'isPageHeading'>

export interface ListItem {
  text?: string
  value?: Item['value']
  hint?: {
    id?: string
    text: string
  }
  checked?: boolean
  selected?: boolean
  label?: ListItemLabel
  condition?: string
}

export interface DateInputItem {
  label?: Label
  type?: string
  id?: string
  name?: string
  value?: Item['value']
  classes?: string
  condition?: undefined
}

// TODO: Break this down for each component (Same as model/Component).
export interface ViewModel extends Record<string, unknown> {
  label?: Label
  type?: string
  id?: string
  name?: string
  value?: FormValue
  hint?: {
    id?: string
    text: string
  }
  prefix?: {
    text: string
  }
  suffix?: {
    text: string
  }
  classes?: string
  condition?: string
  errors?: FormSubmissionError[]
  errorMessage?: {
    text: string
  }
  summaryHtml?: string
  html?: string
  attributes: {
    autocomplete?: string
    maxlength?: number
    multiple?: string
    accept?: string
    inputmode?: string
  }
  content?: Content | Content[] | string
  maxlength?: number
  maxwords?: number
  rows?: number
  items?: ListItem[] | DateInputItem[]
  fieldset?: {
    attributes?: string | Record<string, string>
    legend?: Label
  }
  formGroup?: {
    classes?: string
    attributes?: string | Record<string, string>
  }
  children?: ComponentViewModel[]
  upload?: {
    count: number
    pendingCount: number
    successfulCount: number
    summary: FileUploadSummaryRow[]
  }
}

export interface FileUploadSummaryRow {
  name: string
  errorMessage?: string
  size: string
  tag: { classes: string; text: string }
  uploadId: string
}

export interface ComponentViewModel {
  type: ComponentType
  isFormComponent: boolean
  model: ViewModel
}

export enum DataType {
  List = 'list',
  Text = 'text',
  Date = 'date',
  MonthYear = 'monthYear',
  Number = 'number',
  File = 'file'
}
