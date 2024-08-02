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
        fileStatus: joi.string().valid('complete').required(),
        contentLength: joi.number().required(),
        checksumSha256: joi.string().required(),
        s3Key: joi.string().required(),
        s3Bucket: joi.string().required()
      })
      .required()

    const statusSchema = joi
      .object({
        uploadStatus: joi.string().valid('ready').required(),
        metadata: joi
          .object()
          .required()
          .keys({
            formId: joi.string().required(),
            retrievalKey: joi.string().email().required(),
            path: joi.string().uri({ relativeOnly: true }).required()
          }),
        form: joi.object().required().keys({
          file: fileSchema
        }),
        numberOfRejectedFiles: joi.number().valid(0).required()
      })
      .required()

    const itemSchema = joi
      .object({
        uploadId: joi.string().uuid().required(),
        status: statusSchema
      })
      .label(title.toLowerCase())
      .required()

    let formSchema = joi
      .array()
      .items(itemSchema)
      .label(title.toLowerCase())
      .required()

    if (options.required === false) {
      formSchema = formSchema.allow('').optional()
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

    // if (options.customValidationMessage) {
    //   const message = options.customValidationMessage

    //   formSchema = formSchema.messages({
    //     'any.required': message,
    //     'string.empty': message,
    //     'string.max': message,
    //     'string.min': message,
    //     'string.length': message,
    //     'string.pattern.base': message
    //   })
    // }

    this.formSchema = joi.any()
    this.stateSchema = formSchema.default(null).allow(null)
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
    const files = payload[this.name] ?? []
    const count = files.length
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
      } else if (fileStatus === 'rejected') {
        tag = uploadTag('red', 'Error')
      } else {
        tag = uploadTag('yellow', 'Uploading')
      }

      const key = file.hasError
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
              text: 'Remove',
              visuallyHiddenText: 'remove'
            }
          ]
        }
      }
    })

    const viewModel = {
      count,
      successfulCount,
      summary: { classes: 'govuk-summary-list--long-key', rows }
    }

    return viewModel
  }
}
