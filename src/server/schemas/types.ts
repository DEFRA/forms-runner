import { type ComponentType, type ConfirmationPage } from '@defra/forms-model'

export interface Field {
  key: string
  type: ComponentType
  title: string
  answer: any
}

export interface Question {
  category?: string
  question: string
  fields: Field[]
}

export type InitialiseSessionField = Pick<Field, 'key' | 'answer'>
export type InitialiseSessionQuestion = {
  fields: InitialiseSessionField[]
} & Question

export interface InitialiseSessionSchema {
  options: {
    callbackUrl: string
    redirectPath?: string
    customText: ConfirmationPage['customText']
    components: ConfirmationPage['components']
  }
  questions: InitialiseSessionQuestion[]
}
