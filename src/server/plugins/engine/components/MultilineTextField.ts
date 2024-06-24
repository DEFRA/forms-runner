import { type MultilineTextFieldComponent } from '@defra/forms-model'
import Joi, { type Schema, type StringSchema } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type MultilineTextFieldViewModel } from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

/**
 * Check if the input is over the word count
 * @see GOV.UK Frontend {@link https://github.com/alphagov/govuk-frontend/blob/v5.4.0/packages/govuk-frontend/src/govuk/components/character-count/character-count.mjs#L343 | Character count `maxwords` implementation}
 */
function inputIsOverWordCount(input: string, maxWords: number) {
  const tokens = input.match(/\S+/g) ?? []
  return maxWords > tokens.length
}

export class MultilineTextField extends FormComponent {
  formSchema: StringSchema
  options: MultilineTextFieldComponent['options']
  schema: MultilineTextFieldComponent['schema']
  customValidationMessage?: string
  isCharacterOrWordCount = false

  constructor(def: MultilineTextFieldComponent, model: FormModel) {
    super(def, model)
    this.options = def.options
    this.schema = def.schema
    this.formSchema = Joi.string()
    this.formSchema = this.formSchema.label(def.title.toLowerCase())
    const { maxWords, customValidationMessage } = def.options
    const isRequired = def.options.required ?? true

    if (isRequired) {
      this.formSchema = this.formSchema.required()
    } else {
      this.formSchema = this.formSchema.allow('').allow(null)
    }
    this.formSchema = this.formSchema.ruleset

    if (def.schema.max) {
      this.formSchema = this.formSchema.max(def.schema.max)
      this.isCharacterOrWordCount = true
    }

    if (def.schema.min) {
      this.formSchema = this.formSchema.min(def.schema.min)
    }

    if (maxWords ?? false) {
      this.formSchema = this.formSchema.custom((value, helpers) => {
        if (inputIsOverWordCount(value, maxWords)) {
          helpers.error('string.maxWords')
        }
        return value
      }, 'max words validation')
      this.isCharacterOrWordCount = true
    }

    if (customValidationMessage) {
      this.formSchema = this.formSchema.rule({
        message: customValidationMessage
      })
    }
  }

  getFormSchemaKeys() {
    return { [this.name]: this.formSchema as Schema }
  }

  getStateSchemaKeys() {
    return { [this.name]: this.formSchema as Schema }
  }

  getViewModel(
    payload: FormPayload,
    errors?: FormSubmissionErrors
  ): MultilineTextFieldViewModel {
    const schema = this.schema
    const options = this.options
    const viewModel = super.getViewModel(
      payload,
      errors
    ) as MultilineTextFieldViewModel
    viewModel.isCharacterOrWordCount = this.isCharacterOrWordCount

    if (schema.max ?? false) {
      viewModel.maxlength = schema.max
    }

    if (options.rows ?? false) {
      viewModel.rows = options.rows
    }

    if (options.maxWords ?? false) {
      viewModel.maxwords = options.maxWords
    }
    return viewModel
  }
}
