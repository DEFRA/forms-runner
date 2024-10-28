import { type ResponseObject } from '@hapi/hapi'

import {
  type ComponentCollectionViewModel,
  type FormComponentViewModel
} from '~/src/server/plugins/engine/components/types.js'
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

export interface FormSubmissionError {
  path: string // e.g: "firstName"
  href: string // e.g: "#firstName"
  name: string // e.g: "firstName"
  text: string // e.g: '"First name" is not allowed to be empty'
}

export interface FormSubmissionErrors {
  titleText: string // e.b: "There is a problem"
  errorList: FormSubmissionError[]
}

/**
 * Form POST for question pages
 * (after Joi has converted value types)
 */
export type FormPayload = {
  /**
   * Crumb plugin (CSRF protection) generated ID from hidden form input
   */
  crumb?: string
} & FormData

export type FormData = Partial<Record<string, FormValue>>
export type FormValue = NonNullable<unknown> | undefined

export type FormState = Partial<Record<string, FormStateValue>>
export type FormStateValue = FormValue | null

export interface FormValidationResult<ValueType extends object = FormPayload> {
  value?: ValueType
  errors?: FormSubmissionErrors | null
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

export interface PageViewModelBase {
  page: PageController
  name?: string
  pageTitle: string
  sectionTitle?: string
  showTitle: boolean
  components: ComponentCollectionViewModel
  errors?: FormSubmissionErrors
  isStartPage: boolean
  startPage?: ResponseObject
  backLink?: string
  feedbackLink?: string
  serviceUrl: string
  phaseTag?: string
  notificationEmailWarning?: {
    slug: string
    designerUrl: string
  }
}

export interface FileUploadPageViewModel extends PageViewModelBase {
  page: FileUploadPageController
  path: string
  formAction?: string
  fileUploadComponent: FormComponentViewModel
  preUploadComponents: ComponentCollectionViewModel
}

export type PageViewModel = PageViewModelBase | FileUploadPageViewModel
