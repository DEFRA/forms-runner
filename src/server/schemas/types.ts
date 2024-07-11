import { type ConfirmationPage } from '@defra/forms-model'

import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'

export interface Field {
  key: string
  type: DetailItem['dataType']
  title: DetailItem['title']
  answer: DetailItem['rawValue']
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
