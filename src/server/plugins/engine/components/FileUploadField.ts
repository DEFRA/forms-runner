import { type FileUploadFieldComponent } from '@defra/forms-model'
import joi, { type ArraySchema } from 'joi'

import {
  FormComponent,
  isUploadState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import {
  FileStatus,
  UploadStatus,
  type FileState,
  type FileUpload,
  type FileUploadMetadata,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState,
  type SummaryList,
  type SummaryListAction,
  type SummaryListRow,
  type UploadState,
  type UploadStatusFileResponse,
  type UploadStatusResponse
} from '~/src/server/plugins/engine/types.js'
import { render } from '~/src/server/plugins/nunjucks/index.js'
import { type FormQuery } from '~/src/server/routes/types.js'

export const uploadIdSchema = joi.string().uuid().required()

export const fileSchema = joi
  .object<FileUpload>({
    fileId: joi.string().uuid().required(),
    filename: joi.string().required(),
    contentLength: joi.number().required()
  })
  .required()

export const tempFileSchema = fileSchema.append({
  fileStatus: joi
    .string()
    .valid(FileStatus.complete, FileStatus.rejected, FileStatus.pending)
    .required(),
  errorMessage: joi.string().optional()
})

export const formFileSchema = fileSchema.append({
  fileStatus: joi.string().valid(FileStatus.complete).required()
})

export const metadataSchema = joi
  .object<FileUploadMetadata>()
  .keys({
    retrievalKey: joi.string().email().required()
  })
  .required()

export const tempStatusSchema = joi
  .object<UploadStatusFileResponse>({
    uploadStatus: joi
      .string()
      .valid(UploadStatus.ready, UploadStatus.pending)
      .required(),
    metadata: metadataSchema,
    form: joi.object().required().keys({
      file: tempFileSchema
    }),
    numberOfRejectedFiles: joi.number().optional()
  })
  .required()

export const formStatusSchema = joi
  .object<UploadStatusResponse>({
    uploadStatus: joi.string().valid(UploadStatus.ready).required(),
    metadata: metadataSchema,
    form: joi.object().required().keys({
      file: formFileSchema
    }),
    numberOfRejectedFiles: joi.number().valid(0).required()
  })
  .required()

export const itemSchema = joi.object<FileState>({
  uploadId: uploadIdSchema
})

export const tempItemSchema = itemSchema.append({
  status: tempStatusSchema
})

export const formItemSchema = itemSchema.append({
  status: formStatusSchema
})

export class FileUploadField extends FormComponent {
  declare options: FileUploadFieldComponent['options']
  declare schema: FileUploadFieldComponent['schema']
  declare formSchema: ArraySchema<FileState>
  declare stateSchema: ArraySchema<FileState>

  constructor(
    def: FileUploadFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { options, schema, title } = def

    let formSchema = joi
      .array<FileState>()
      .label(title.toLowerCase())
      .single()
      .required()

    if (options.required === false) {
      formSchema = formSchema.optional()
    }

    if (typeof schema.length !== 'number') {
      if (typeof schema.max === 'number') {
        formSchema = formSchema.max(schema.max)
      }

      if (typeof schema.min === 'number') {
        formSchema = formSchema.min(schema.min)
      }
    } else {
      formSchema = formSchema.length(schema.length)
    }

    this.formSchema = formSchema.items(formItemSchema)
    this.stateSchema = formSchema
      .items(formItemSchema)
      .default(null)
      .allow(null)

    this.options = options
    this.schema = schema
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { name } = this
    return this.getFormValue(state[name])
  }

  getFormValue(value?: FormStateValue | FormState) {
    return this.isValue(value) ? value : undefined
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const files = this.getFormValueFromState(state)
    if (!files?.length) {
      return ''
    }

    const unit = files.length === 1 ? 'file' : 'files'
    return `Uploaded ${files.length} ${unit}`
  }

  getContextValueFromState(state: FormSubmissionState) {
    const files = this.getFormValueFromState(state)
    return files?.map(({ status }) => status.form.file.fileId) ?? null
  }

  getViewModel(
    payload: FormPayload,
    errors?: FormSubmissionError[],
    query: FormQuery = {}
  ) {
    const { options, page } = this

    // Allow preview URL direct access
    const isForceAccess = 'force' in query

    const viewModel = super.getViewModel(payload, errors)
    const { attributes, id, value } = viewModel

    const files = this.getFormValue(value) ?? []
    const filtered = files.filter(
      (file) => file.status.form.file.fileStatus === FileStatus.complete
    )
    const count = filtered.length

    const rows: SummaryListRow[] = filtered.map((item, index) => {
      const { status } = item
      const { form } = status
      const { file } = form

      const tag = { classes: 'govuk-tag--green', text: 'Uploaded' }

      const valueHtml = render
        .view('components/fileuploadfield-value.html', {
          context: { params: { tag } }
        })
        .trim()

      const keyHtml = render
        .view('components/fileuploadfield-key.html', {
          context: {
            params: {
              name: file.filename,
              errorMessage: errors && file.errorMessage
            }
          }
        })
        .trim()

      const items: SummaryListAction[] = []

      // Remove summary list actions from previews
      if (!isForceAccess) {
        const path = `/${item.uploadId}/confirm-delete`
        const href = page?.getHref(`${page.path}${path}`) ?? '#'

        items.push({
          href,
          text: 'Remove',
          classes: 'govuk-link--no-visited-state',
          attributes: { id: `${id}__${index}` },
          visuallyHiddenText: file.filename
        })
      }

      return {
        key: {
          html: keyHtml
        },
        value: {
          html: valueHtml
        },
        actions: {
          items
        }
      } satisfies SummaryListRow
    })

    // Set up the `accept` attribute
    if ('accept' in options) {
      attributes.accept = options.accept
    }

    const summaryList: SummaryList = {
      classes: 'govuk-summary-list--long-key',
      rows
    }

    return {
      ...viewModel,

      // File input can't have a initial value
      value: '',

      // Override the component name we send to CDP
      name: 'file',

      upload: {
        count,
        summaryList
      }
    }
  }

  isValue(value?: FormStateValue | FormState): value is UploadState {
    return isUploadState(value)
  }
}
