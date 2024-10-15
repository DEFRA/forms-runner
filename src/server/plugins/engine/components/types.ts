import {
  type ContentComponentsDef,
  type FormComponentsDef,
  type Item
} from '@defra/forms-model'

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

// TODO: Break this down for each component (Same as model/Component).
export interface ViewModel {
  label?: Label
  type?: string
  id?: string
  name?: string
  value?: any // TODO
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
    step?: string
  }
  content?: Content | Content[] | string
  rows?: number
  items?: ListItem[]
  fieldset?: {
    attributes?: string | Record<string, string>
    legend?: Label
  }
  formGroup?: {
    classes?: string
    attributes?: string | Record<string, string>
  }
  children?: ComponentCollectionViewModel
  autocomplete?: string
}

export type MultilineTextFieldViewModel = {
  maxlength?: number
  isCharacterOrWordCount: boolean
  maxwords?: number
} & ViewModel

export interface FileUploadSummaryRow {
  name: string
  errorMessage?: string
  size: string
  tag: { classes: string; text: string }
  uploadId: string
}

export type FileUploadFieldViewModel = {
  upload: {
    count: number
    pendingCount: number
    successfulCount: number
    summary: FileUploadSummaryRow[]
  }
} & ViewModel

export interface FormComponentViewModel {
  type: FormComponentsDef['type']
  isFormComponent: true
  model: ViewModel
}

export interface ContentComponentViewModel {
  type: ContentComponentsDef['type']
  isFormComponent: false
  model: ViewModel
}

export type ComponentCollectionViewModel = (
  | FormComponentViewModel
  | ContentComponentViewModel
)[]

export enum DataType {
  List = 'list',
  Text = 'text',
  Date = 'date',
  MonthYear = 'monthYear',
  Number = 'number',
  File = 'file'
}
