import { type FileUploadFieldComponent } from '@defra/forms-model'
import joi, { type ArraySchema } from 'joi'

import { config } from '~/src/config/index.js'
import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { filesize } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  FileStatus,
  type FileState,
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

const designerUrl = config.get('designerUrl')

export const uploadIdSchema = joi.string().uuid().required()

export const fileSchema = joi
  .object({
    fileId: joi.string().uuid().required(),
    filename: joi.string().required(),
    contentLength: joi.number().required()
  })
  .required()

export const tempFileSchema = fileSchema.append({
  fileStatus: joi.string().valid('complete', 'rejected', 'pending').required(),
  errorMessage: joi.string().optional()
})

export const formFileSchema = fileSchema.append({
  fileStatus: joi.string().valid('complete').required()
})

export const metadataSchema = joi
  .object()
  .keys({
    retrievalKey: joi.string().email().required()
  })
  .required()

export const tempStatusSchema = joi
  .object({
    uploadStatus: joi.string().valid('ready', 'pending').required(),
    metadata: metadataSchema,
    form: joi.object().required().keys({
      file: tempFileSchema
    }),
    numberOfRejectedFiles: joi.number().optional()
  })
  .required()

export const formStatusSchema = joi
  .object({
    uploadStatus: joi.string().valid('ready').required(),
    metadata: metadataSchema,
    form: joi.object().required().keys({
      file: formFileSchema
    }),
    numberOfRejectedFiles: joi.number().valid(0).required()
  })
  .required()

export const itemSchema = joi.object({
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

  declare formSchema: ArraySchema<object>
  declare stateSchema: ArraySchema<object>

  constructor(def: FileUploadFieldComponent, model: FormModel) {
    super(def, model)

    const { options, schema, title } = def

    let formSchema = joi.array().label(title.toLowerCase()).single().required()

    if (options.required === false) {
      formSchema = formSchema.optional().allow(null)
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

    this.formSchema = formSchema.items(formItemSchema).empty(null)
    this.stateSchema = formSchema.items(formItemSchema)
    this.options = options
    this.schema = schema
  }

  getFormDataFromState(state: FormSubmissionState) {
    const { name } = this

    const values = Array.isArray(state[name]) ? state[name] : []

    return {
      [name]: values.filter(
        (value): value is FileState =>
          typeof value === 'object' && 'uploadId' in value
      )
    }
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const { name } = this

    const { [name]: values } = this.getFormDataFromState(state)
    const count = values.length

    if (!count) {
      return super.getDisplayStringFromState(state)
    }

    return `You uploaded ${count} file${count !== 1 ? 's' : ''}`
  }

  getMarkdownStringFromState(state: FormSubmissionState) {
    const values = this.getFormValueFromState(state)
    const count = values.length

    const files = values.map(({ status }) => status.form.file)

    const bullets = files
      .map(({ filename, fileId }) => {
        return `* [${filename}](${designerUrl}/file-download/${fileId})`
      })
      .join('\n')

    return `${count} file${count !== 1 ? 's' : ''} uploaded:\n\n${bullets}`
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(payload, errors)

    const files = (payload[this.name] ?? []) as FileState[]
    const count = files.length

    let pendingCount = 0
    let successfulCount = 0

    const summary = files.map((item: FileState) => {
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

    // File input can't have a initial value
    viewModel.value = ''

    // Override the component name we send to CDP
    viewModel.name = 'file'

    // Set up the `accept` attribute
    if ('accept' in this.options) {
      viewModel.attributes.accept = this.options.accept
    }

    viewModel.upload = {
      count,
      pendingCount,
      successfulCount,
      summary
    }

    return viewModel
  }
}
