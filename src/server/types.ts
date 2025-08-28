import { type FormModel } from '@defra/forms-engine-plugin/engine/models/index.js'
import { type DetailItem } from '@defra/forms-engine-plugin/engine/models/types.js'
import { type FormContext } from '@defra/forms-engine-plugin/engine/types.js'
import {
  type FormDefinition,
  type FormMetadata,
  type SubmitPayload,
  type SubmitResponsePayload
} from '@defra/forms-model'

import {
  type FormRequestPayload,
  type FormStatus
} from '~/src/server/routes/types.js'

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
  ) => Promise<object>
  submit: (data: SubmitPayload) => Promise<SubmitResponsePayload | undefined>
}

export interface Services {
  formsService: FormsService
  formSubmissionService: FormSubmissionService
  outputService: OutputService
}

export interface RouteConfig {
  formFileName?: string
  formFilePath?: string
  enforceCsrf?: boolean
}

export interface OutputService {
  submit: (
    context: FormContext,
    request: FormRequestPayload,
    model: FormModel,
    emailAddress: string,
    items: DetailItem[],
    submitResponse: SubmitResponsePayload,
    formMetadata?: FormMetadata
  ) => Promise<void>
}
