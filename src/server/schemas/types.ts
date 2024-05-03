import { type ComponentType, type ConfirmationPage } from '@defra/forms-model'

import { type FeeDetails } from '~/src/server/services/payService.js'

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

export interface WebhookSchema {
  name: string
  preferredLanguage?: string
  fees: FeeDetails
  questions: Question[]
  metadata?: Record<string, unknown>
}

export type InitialiseSessionField = Pick<Field, 'key' | 'answer'>
export type InitialiseSessionQuestion = {
  fields: InitialiseSessionField[]
} & Question

export type InitialiseSessionSchema = {
  options: {
    callbackUrl: string
    redirectPath?: string
    customText: ConfirmationPage['customText']
    components: ConfirmationPage['components']
  }
  questions: InitialiseSessionQuestion[]
} & Pick<WebhookSchema, 'questions' | 'metadata'>
