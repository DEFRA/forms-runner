import {
  type ComponentDef,
  type Item,
  type List,
  type Page
} from '@defra/forms-model'
import { type ValidationErrorItem } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type Component } from '~/src/server/plugins/engine/components/helpers.js'
import {
  type BackLink,
  type ComponentText,
  type ComponentViewModel
} from '~/src/server/plugins/engine/components/types.js'
import { type PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { type ViewContext } from '~/src/server/plugins/nunjucks/types.js'
import { type FormAction, type FormRequest } from '~/src/server/routes/types.js'

/**
 * Form submission state stores the following in Redis:
 * Props containing user's submitted values as `{ [inputId]: value }` or as `{ [sectionName]: { [inputName]: value } }`
 *   a) . e.g:
 * ```ts
 *     {
 *       _C9PRHmsgt: 'Ben',
 *       WfLk9McjzX: 'Music',
 *       IK7jkUFCBL: 'Royal Academy of Music'
 *     }
 * ```
 *
 *   b)
 * ```ts
 *   {
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
  upload?: Record<string, TempFileState>
} & FormState

export interface FormSubmissionError
  extends Pick<ValidationErrorItem, 'context' | 'path'> {
  href: string // e.g: '#dateField__day'
  name: string // e.g: 'dateField__day'
  text: string // e.g: 'Date field must be a real date'
}

export interface FormParams {
  action?: FormAction
  confirm?: true
  crumb?: string
  itemId?: string
}

/**
 * Form POST for question pages
 * (after Joi has converted value types)
 */
export type FormPayload = FormParams & Partial<Record<string, FormValue>>

export type FormValue =
  | Item['value']
  | Item['value'][]
  | UploadState
  | RepeatListState
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
   * Form submission payload (single page)
   */
  payload: FormPayload

  /**
   * Form submission state (entire form)
   */
  state: FormSubmissionState

  /**
   * Validation errors (entire form)
   */
  errors?: FormSubmissionError[]

  /**
   * Visited paths evaluated from form state
   */
  paths: string[]

  /**
   * Preview URL direct access is allowed
   */
  isForceAccess: boolean

  /**
   * Miscellaneous extra data from event responses
   */
  data: object

  pageDefMap: Map<string, Page>
  listDefMap: Map<string, List>
  componentDefMap: Map<string, ComponentDef>
  pageMap: Map<string, PageControllerClass>
  componentMap: Map<string, Component>
}

export type FormContextRequest = (
  | {
      method: 'get'
      payload?: undefined
    }
  | {
      method: 'post'
      payload: FormPayload
    }
  | {
      method: FormRequest['method']
      payload?: object | undefined
    }
) &
  Pick<FormRequest, 'app' | 'method' | 'params' | 'path' | 'query' | 'url'>

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

export type UploadState = FileState[]

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

export type UploadStatusFileResponse = Exclude<
  UploadStatusResponse,
  { uploadStatus: UploadStatus.initiated }
>

export interface FileState {
  uploadId: string
  status: UploadStatusFileResponse
}

export interface TempFileState {
  upload?: UploadInitiateResponse
  files: UploadState
}

export interface RepeatItemState extends FormPayload {
  itemId: string
}

export type RepeatListState = RepeatItemState[]

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

export interface PageViewModelBase extends Partial<ViewContext> {
  page: PageController
  name?: string
  pageTitle: string
  sectionTitle?: string
  showTitle: boolean
  isStartPage: boolean
  backLink?: BackLink
  feedbackLink?: string
  serviceUrl: string
  phaseTag?: string
}

export interface ItemDeletePageViewModel extends PageViewModelBase {
  context: FormContext
  itemTitle: string
  confirmation?: ComponentText
  buttonConfirm: ComponentText
  buttonCancel: ComponentText
}

export interface FormPageViewModel extends PageViewModelBase {
  components: ComponentViewModel[]
  context: FormContext
  errors?: FormSubmissionError[]
  hasMissingNotificationEmail?: boolean
}

export interface RepeaterSummaryPageViewModel extends PageViewModelBase {
  context: FormContext
  errors?: FormSubmissionError[]
  checkAnswers: CheckAnswers[]
  repeatTitle: string
}

export interface FeaturedFormPageViewModel extends FormPageViewModel {
  formAction?: string
  formComponent: ComponentViewModel
  componentsBefore: ComponentViewModel[]
  uploadId: string | undefined
  proxyUrl: string | null
}

export type PageViewModel =
  | PageViewModelBase
  | ItemDeletePageViewModel
  | FormPageViewModel
  | RepeaterSummaryPageViewModel
  | FeaturedFormPageViewModel
