import { type FileUploadFieldComponent } from '@defra/forms-model'
import joi, { type ArraySchema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import {
  DataType,
  type FileUploadFieldViewModel
} from '~/src/server/plugins/engine/components/types.js'
import { filesize } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormSubmissionState,
  type FormPayload,
  type FormSubmissionErrors,
  type FileState,
  FileStatus
} from '~/src/server/plugins/engine/types.js'

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
  dataType: DataType = DataType.File

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

  getFormValueFromState(state: FormSubmissionState) {
    const { name } = this

    if (Array.isArray(state[name])) {
      return state[name]
    }
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const value = this.getFormValueFromState(state)
    const count = Array.isArray(value) ? value.length : 0

    if (!count) {
      return super.getDisplayStringFromState(state)
    }

    return `You uploaded ${count} file${count !== 1 ? 's' : ''}`
  }

  getViewModel(
    payload: FormPayload,
    errors?: FormSubmissionErrors
  ): FileUploadFieldViewModel {
    const viewModel = super.getViewModel(
      payload,
      errors
    ) as FileUploadFieldViewModel
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
