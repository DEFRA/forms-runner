import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'

export interface Field {
  key: string
  type: DetailItem['dataType']
  title: DetailItem['title']
  answer: DetailItem['rawValue']
  item: DetailItem
}

export interface Question {
  category?: string
  question: string
  fields: Field[]
}

export interface SubmitRecord {
  name: string
  title: string
  value: string
}

export interface SubmitRecordSet {
  title: string
  value: SubmitRecord[][]
}

export interface SubmitPayload {
  sessionId: string
  retrievalKey: string
  main: SubmitRecord[]
  repeaters: SubmitRecordSet[]
}

export interface SubmitResponsePayload {
  message: string
  result: {
    files: {
      main: string
      repeaters: Record<string, string>
    }
  }
}
