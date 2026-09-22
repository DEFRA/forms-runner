import { type FormModel } from '@defra/forms-engine-plugin/engine/models/index.js'
import { type DetailItem } from '@defra/forms-engine-plugin/engine/models/types.js'
import { type FormContext } from '@defra/forms-engine-plugin/engine/types.js'
import {
  type FormRequestPayload,
  type FormStatus
} from '@defra/forms-engine-plugin/types'
import {
  type FormDefinition,
  type FormMetadata,
  type SecurityQuestionsEnum,
  type SubmitPayload,
  type SubmitResponsePayload
} from '@defra/forms-model'

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
  metadata?: FormMetadata
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

export interface SaveAndExitForm {
  id: string
  status: FormStatus
  isPreview: boolean
  baseUrl: string
}

/** Details of a saved form that a memorable word protects */
export interface MemorableWordDetails {
  form: SaveAndExitForm
  authType: 'memorableWord'
  question: SecurityQuestionsEnum
  invalidPasswordAttempts: number
}

/** Details of a saved form that belongs to a signed-in citizen */
export interface CitizenSignInDetails {
  form: SaveAndExitForm
  authType: 'citizenSignIn'
}

export type SaveAndExitDetails = MemorableWordDetails | CitizenSignInDetails

/** The result of a memorable word check */
export interface SaveAndExitResumeDetails {
  form: SaveAndExitForm
  question: SecurityQuestionsEnum
  invalidPasswordAttempts: number
  state: object
  magicLinkGroupId: string
  validPassword: boolean
}

export interface GenerateReferenceNumber {
  referenceNumber: string
}
