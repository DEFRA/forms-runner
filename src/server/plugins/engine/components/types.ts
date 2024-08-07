import { type ComponentType } from '@defra/forms-model'

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
  value?: string | boolean | number
  hint?: {
    html: string
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
    html: string
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

export type FileUploadFieldViewModel = {
  upload: object
} & ViewModel

export type ComponentCollectionViewModel = (
  | {
      type: ComponentType
      isFormComponent: true
      model: ViewModel
    }
  | {
      type: undefined
      isFormComponent: false
      model: ViewModel
    }
)[]

export type DataType =
  | 'list'
  | 'text'
  | 'date'
  | 'monthYear'
  | 'number'
  | 'file'
