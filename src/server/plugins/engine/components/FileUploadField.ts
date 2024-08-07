import { type FileUploadFieldComponent } from '@defra/forms-model'
import joi, { type ArraySchema, type AnySchema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormSubmissionState,
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

function filesize(bytes: number) {
  let i = -1
  const byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB']
  do {
    bytes = bytes / 1000
    i++
  } while (bytes > 1000)

  return Math.max(bytes, 0.1).toFixed(1) + byteUnits[i]
}

export class FileUploadField extends FormComponent {
  declare options: FileUploadFieldComponent['options']

  declare schema: FileUploadFieldComponent['schema']

  declare formSchema: AnySchema
  declare stateSchema: ArraySchema<object>

  constructor(def: FileUploadFieldComponent, model: FormModel) {
    super(def, model)

    const { options, schema, title } = def

    const fileSchema = joi
      .object({
        fileId: joi.string().uuid().required(),
        filename: joi.string().required(),
        contentType: joi.string().required(),
        detectedContentType: joi.string().optional(),
        contentLength: joi.number().required()
      })
      .required()

    const formFileSchema = fileSchema.append({
      fileStatus: joi
        .string()
        .valid('complete', 'rejected', 'pending')
        .required(),
      checksumSha256: joi.string().optional(),
      s3Key: joi.string().optional(),
      s3Bucket: joi.string().optional(),
      hasError: joi.boolean().optional(),
      errorMessage: joi.string().optional()
    })

    const stateFileSchema = fileSchema.append({
      fileStatus: joi.string().valid('complete').required(),
      checksumSha256: joi.string().optional(),
      s3Key: joi.string().required(),
      s3Bucket: joi.string().required()
    })

    const metadataSchema = joi
      .object()
      .keys({
        formId: joi.string().required(),
        retrievalKey: joi.string().email().required(),
        path: joi.string().uri({ relativeOnly: true }).required()
      })
      .required()

    const formStatusSchema = joi
      .object({
        uploadStatus: joi.string().valid('ready', 'pending').required(),
        metadata: metadataSchema,
        form: joi.object().required().keys({
          file: formFileSchema
        }),
        numberOfRejectedFiles: joi.number().optional()
      })
      .required()

    const stateStatusSchema = joi
      .object({
        uploadStatus: joi.string().valid('ready').required(),
        metadata: metadataSchema,
        form: joi.object().required().keys({
          file: stateFileSchema
        }),
        numberOfRejectedFiles: joi.number().valid(0).required()
      })
      .required()

    const itemSchema = joi.object({
      uploadId: joi.string().uuid().required()
    })

    const formItemSchema = itemSchema.append({
      status: formStatusSchema
    })

    const stateItemSchema = itemSchema.append({
      status: stateStatusSchema
    })

    let formSchema = joi.array().label(title.toLowerCase()).required()

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
    this.stateSchema = formSchema.items(stateItemSchema)
    this.options = options
    this.schema = schema
  }

  getFormValueFromState(state: FormSubmissionState) {
    const name = this.name

    if (name in state) {
      return state[name] === null ? [] : state[name]
    }
  }

  getViewModel(payload: FormPayload, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(payload, errors)
    const files = payload[this.name] ?? []
    const count = files.length
    let pendingCount = 0
    let successfulCount = 0

    const rows = files.map((item) => {
      const { status, uploadId } = item
      const { form, uploadStatus } = status
      const { file } = form
      const { fileStatus } = file
      let tag

      const uploadTag = (css: string, text: string) =>
        `<strong class="govuk-tag govuk-tag--${css}">${text}</strong>`

      if (fileStatus === 'complete') {
        successfulCount++
        tag = uploadTag('green', 'Uploaded')
      } else if (fileStatus === 'pending') {
        pendingCount++
        tag = uploadTag('yellow', 'Uploading')
      } else {
        tag = uploadTag('red', 'Error')
      }

      const key =
        errors && file.hasError
          ? {
              html: `<div class="govuk-form-group govuk-form-group--error">
            <div class="govuk-!-margin-bottom-3">${file.filename}</div>
            <p class="govuk-error-message">${file.errorMessage}</p>
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
              href: '#',
              classes: 'govuk-link--no-visited-state',
              text: 'Remove',
              visuallyHiddenText: 'remove'
            }
          ]
        }
      }
    })

    viewModel.value = ''
    viewModel.name = 'file'

    if ('accept' in this.options) {
      viewModel.attributes.accept = this.options.accept
    }

    viewModel.upload = {
      count,
      pendingCount,
      successfulCount,
      summary: { classes: 'govuk-summary-list--long-key', rows },
      formAction: payload.formAction
    }

    return viewModel
  }
}
