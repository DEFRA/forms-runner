import { type FileUploadFieldComponent } from '@defra/forms-model'
import joi, { type ArraySchema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FileUploadFieldViewModel } from '~/src/server/plugins/engine/components/types.js'
import { escapeHtml, filesize } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormSubmissionState,
  type FormPayload,
  type FormSubmissionErrors,
  type FileState,
  type FilesState,
  FileStatus
} from '~/src/server/plugins/engine/types.js'

export const uploadIdSchema = joi.string().uuid().required()

export const fileSchema = joi
  .object({
    fileId: joi.string().uuid().required(),
    filename: joi.string().required(),
    contentType: joi.string().required(),
    detectedContentType: joi.string().optional(),
    contentLength: joi.number().required()
  })
  .required()

export const tempFileSchema = fileSchema.append({
  fileStatus: joi.string().valid('complete', 'rejected', 'pending').required(),
  checksumSha256: joi.string().optional(),
  s3Key: joi.string().optional(),
  s3Bucket: joi.string().optional(),
  hasError: joi.boolean().optional(),
  errorMessage: joi.string().optional()
})

export const formFileSchema = fileSchema.append({
  fileStatus: joi.string().valid('complete').required(),
  checksumSha256: joi.string().optional(),
  s3Key: joi.string().required(),
  s3Bucket: joi.string().required()
})

export const metadataSchema = joi
  .object()
  .keys({
    formId: joi.string().required(),
    retrievalKey: joi.string().email().required(),
    path: joi.string().uri({ relativeOnly: true }).required()
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
    return state[this.name]
      ?.map((file: FileState) => file.status.form.file.filename)
      .join(', ')
  }

  getViewModel(
    payload: FormPayload,
    errors?: FormSubmissionErrors
  ): FileUploadFieldViewModel {
    const viewModel = super.getViewModel(
      payload,
      errors
    ) as FileUploadFieldViewModel
    const files = (payload[this.name] ?? []) as FilesState
    const count = files.length
    let pendingCount = 0
    let successfulCount = 0

    const rows = files.map((item: FileState) => {
      const { status } = item
      const { form } = status
      const { file } = form
      const { fileStatus } = file
      let tag

      const uploadTag = (css: string, text: string) =>
        `<strong class="govuk-tag govuk-tag--${css}">${text}</strong>`

      if (fileStatus === FileStatus.complete) {
        successfulCount++
        tag = uploadTag('green', 'Uploaded')
      } else if (fileStatus === FileStatus.pending) {
        pendingCount++
        tag = uploadTag('yellow', 'Uploading')
      } else {
        tag = uploadTag('red', 'Error')
      }

      const key =
        errors && file.hasError
          ? {
              html: `<div class="govuk-form-group govuk-form-group--error govuk-!-margin-bottom-0">
          <div class="govuk-!-margin-bottom-3">${escapeHtml(file.filename)}</div>
          <p class="govuk-error-message">${escapeHtml(file.errorMessage ?? '')}</p>
        </div>`
            }
          : {
              text: file.filename
            }

      return {
        key,
        value: {
          html: `${filesize(file.contentLength)} ${tag}`
        },
        actions: {
          items: [
            {
              html: `<button type="submit" data-prevent-double-click="true"
                class="govuk-button govuk-button--secondary govuk-!-margin-0"
                name="__remove"
                value="${item.uploadId}">Remove</button>`
            }
          ]
        }
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
      summary: { classes: 'govuk-summary-list--long-key', rows },
      formAction: files.formAction
    }

    return viewModel
  }
}
