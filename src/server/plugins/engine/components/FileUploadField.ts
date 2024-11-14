import { type FileUploadFieldComponent } from '@defra/forms-model'
import joi, { type ArraySchema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { DataType } from '~/src/server/plugins/engine/components/types.js'
import { filesize } from '~/src/server/plugins/engine/helpers.js'
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
  type UploadState,
  type UploadStatusResponse
} from '~/src/server/plugins/engine/types.js'

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
  .object<UploadState>({
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

  dataType: DataType = DataType.File

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
    const value = super.getFormValueFromState(state)
    return this.isValue(value) ? value : undefined
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const files = this.getFormValueFromState(state) ?? []
    const count = files.length

    if (!count) {
      return super.getDisplayStringFromState(state)
    }

    return `You uploaded ${count} file${count !== 1 ? 's' : ''}`
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionError[]) {
    const { options } = this

    const viewModel = super.getViewModel(payload, errors)
    const { attributes, value } = viewModel

    const files = this.isValue(value) ? value : []
    const count = files.length

    let pendingCount = 0
    let successfulCount = 0

    const summary = files.map((item) => {
      const { status } = item
      const { form } = status
      const { file } = form
      const { fileStatus } = file
      let tag

      if (fileStatus === FileStatus.complete) {
        successfulCount++
        tag = { classes: 'govuk-tag--green', text: 'Uploaded' }
      } else if (fileStatus === FileStatus.pending) {
        pendingCount++
        tag = { classes: 'govuk-tag--yellow', text: 'Uploading' }
      } else {
        tag = { classes: 'govuk-tag--red', text: 'Error' }
      }

      return {
        name: file.filename,
        errorMessage: errors && file.errorMessage,
        size: filesize(file.contentLength),
        tag,
        uploadId: item.uploadId
      }
    })

    // Set up the `accept` attribute
    if ('accept' in options) {
      attributes.accept = options.accept
    }

    return {
      ...viewModel,

      // File input can't have a initial value
      value: '',

      // Override the component name we send to CDP
      name: 'file',

      upload: {
        count,
        pendingCount,
        successfulCount,
        summary
      }
    }
  }

  isValue(value?: FormStateValue | FormState): value is FileState[] {
    return FileUploadField.isFileUploads(value)
  }

  static isFileUploads(
    value?: FormStateValue | FormState
  ): value is FileState[] {
    if (!Array.isArray(value)) {
      return false
    }

    // Skip checks when empty
    if (!value.length) {
      return true
    }

    return value.every(
      (value) => typeof value === 'object' && 'uploadId' in value
    )
  }
}
