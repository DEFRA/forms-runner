import { type IncomingMessage } from 'http'

import {
  type FormDefinition,
  type FormMetadata,
  type SubmitPayload,
  type SubmitResponsePayload
} from '@defra/forms-model'

import { type FormStatus } from '~/src/server/routes/types.js'

export interface FormsService {
  getFormMetadata: (slug: string) => Promise<FormMetadata>
  getFormDefinition: (
    id: string,
    state: FormStatus
  ) => Promise<FormDefinition | undefined>
}

export interface FormSubmissionService {
  persistFiles: (
    files: { fileId: string; initiatedRetrievalKey: string }[],
    persistedRetrievalKey: string
  ) => Promise<
    | {
        res: IncomingMessage
        error: Error | object
        payload?: undefined
      }
    | {
        res: IncomingMessage
        payload: object
        error?: undefined
      }
  >
  submit: (data: SubmitPayload) => Promise<SubmitResponsePayload | undefined>
}

export interface Services {
  formsService: FormsService
  formSubmissionService: FormSubmissionService
}

export interface RouteConfig {
  formFileName?: string
  formFilePath?: string
  enforceCsrf?: boolean
  services?: Services
}
