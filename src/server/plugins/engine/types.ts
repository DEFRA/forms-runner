import { type Item } from '@defra/forms-model'
import { type ResponseObject } from '@hapi/hapi'
import { type ValidationErrorItem } from 'joi'

import { type FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import {
  type ComponentText,
  type ComponentViewModel
} from '~/src/server/plugins/engine/components/types.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FileUploadPageController,
  type PageController
} from '~/src/server/plugins/engine/pageControllers/index.js'

/**
 * Form submission state stores the following in Redis:
 * 1. progress[]: which indicates the urls the user have already submitted.
 * 2. Other props containing user's submitted values as `{ [inputId]: value }` or as `{ [sectionName]: { [inputName]: value } }`
 *   a) . e.g:
 * ```ts
 *     {
 *       progress: [
 *         '/gZovGvanSq/student-visa-application?visit=HxCva29Xhd',
 *         '/gZovGvanSq/what-are-you-going-to-study?visit=HxCva29Xhd'
 *       ],
 *       _C9PRHmsgt: 'Ben',
 *       WfLk9McjzX: 'Music',
 *       IK7jkUFCBL: 'Royal Academy of Music'
 *     }
 * ```
 *
 *   b)
 * ```ts
 *   {
 *         progress: [
 *           '/gZovGvanSq/uk-passport?visit=pQ1LIzb5kE',
 *           '/gZovGvanSq/how-many-people?visit=pQ1LIzb5kE',
 *           '/gZovGvanSq/applicant-one?visit=pQ1LIzb5kE',
 *           '/gZovGvanSq/applicant-one-address?visit=pQ1LIzb5kE',
 *           '/gZovGvanSq/contact-details?visit=pQ1LIzb5kE'
 *         ],
 *         checkBeforeYouStart: { ukPassport: true },
 *         applicantDetails: {
 *           numberOfApplicants: 1,
 *           phoneNumber: '77777777',
 *           emailAddress: 'aaa@aaa.com'
 *         },
 *         applicantOneDetails: {
 *           firstName: 'a',
 *           middleName: 'a',
 *           lastName: 'a',
 *           address: { addressLine1: 'a', addressLine2: 'a', town: 'a', postcode: 'a' }
 *         }
 *     }
 * ```
 */

/**
 * Form submission state
 */
export type FormSubmissionState = {
  /**
   * URL paths the user has already submitted
   */
  progress?: string[]
  upload?: Record<string, TempFileState>
} & FormState

export interface FormSubmissionError
  extends Pick<ValidationErrorItem, 'context' | 'path'> {
  href: string // e.g: '#dateField__day'
  name: string // e.g: 'dateField__day'
  text: string // e.g: 'Date field must be a real date'
}

/**
 * Form POST for question pages
 * (after Joi has converted value types)
 */
export type FormPayload = Partial<Record<string, FormValue>>
export type FormValue =
  | Item['value']
  | Item['value'][]
  | FileState[]
  | RepeatState[]
  | undefined

export type FormState = Partial<Record<string, FormStateValue>>
export type FormStateValue = Exclude<FormValue, undefined> | null

export interface FormValidationResult<
  ValueType extends FormPayload | FormSubmissionState
> {
  value: ValueType
  errors: FormSubmissionError[] | undefined
}

export interface FormContext {
  /**
   * Evaluation form state only (filtered by visited paths),
   * with values formatted for condition evaluation using
   * {@link FormComponent.getContextValueFromState}
   */
  evaluationState: FormState

  /**
   * Relevant form state only (filtered by visited paths)
   */
  relevantState: FormState

  /**
   * Relevant pages only (filtered by visited paths)
   */
  relevantPages: PageControllerClass[]

  /**
   * Visited paths evaluated from form state
   */
  paths: string[]
}

export interface UploadInitiateResponse {
  uploadId: string
  uploadUrl: string
  statusUrl: string
}

export enum UploadStatus {
  initiated = 'initiated',
  pending = 'pending',
  ready = 'ready'
}

export enum FileStatus {
  complete = 'complete',
  rejected = 'rejected',
  pending = 'pending'
}

export type FileUpload = {
  fileId: string
  filename: string
  contentLength: number
} & (
  | {
      fileStatus: FileStatus.complete | FileStatus.rejected | FileStatus.pending
      errorMessage?: string
    }
  | {
      fileStatus: FileStatus.complete
      errorMessage?: undefined
    }
)

export interface FileUploadMetadata {
  retrievalKey: string
}

export type UploadStatusResponse =
  | {
      uploadStatus: UploadStatus.initiated
      metadata: FileUploadMetadata
      form: { file?: undefined }
    }
  | {
      uploadStatus: UploadStatus.pending | UploadStatus.ready
      metadata: FileUploadMetadata
      form: { file: FileUpload }
      numberOfRejectedFiles?: number
    }
  | {
      uploadStatus: UploadStatus.ready
      metadata: FileUploadMetadata
      form: { file: FileUpload }
      numberOfRejectedFiles: 0
    }

export type UploadState = Exclude<
  UploadStatusResponse,
  { uploadStatus: UploadStatus.initiated }
>

export interface FileState {
  uploadId: string
  status: UploadState
}

export interface TempFileState {
  upload?: UploadInitiateResponse
  files: FileState[]
}

export interface RepeatState extends FormPayload {
  itemId: string
}

export interface CheckAnswers {
  title?: ComponentText
  summaryList: SummaryList
}

export interface SummaryList {
  classes?: string
  rows: SummaryListRow[]
}

export interface SummaryListRow {
  key: ComponentText
  value: ComponentText
  actions?: { items: SummaryListAction[] }
}

export type SummaryListAction = ComponentText & {
  href: string
  visuallyHiddenText: string
}

export interface PageViewModelBase {
  page: PageController
  name?: string
  pageTitle: string
  sectionTitle?: string
  showTitle: boolean
  components: ComponentViewModel[]
  errors?: FormSubmissionError[]
  isStartPage: boolean
  startPage?: ResponseObject
  backLink?: string
  feedbackLink?: string
  serviceUrl: string
  phaseTag?: string
  googleAnalyticsTrackingId?: string
  notificationEmailWarning?: {
    slug: string
    designerUrl: string
  }
}

export interface FileUploadPageViewModel extends PageViewModelBase {
  page: FileUploadPageController
  path: string
  formAction?: string
  fileUploadComponent: ComponentViewModel
  preUploadComponents: ComponentViewModel[]
}

export type PageViewModel = PageViewModelBase | FileUploadPageViewModel
