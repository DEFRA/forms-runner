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
  options: MultilineTextFieldComponent['options']
  schema: MultilineTextFieldComponent['schema']
  customValidationMessage?: string
  isCharacterOrWordCount = false

  constructor(def: MultilineTextFieldComponent, model: FormModel) {
    super(def, model)

    const { schema, options, title } = def
    const { min, max } = schema

    let formSchema = Joi.string()
      .default('')
      .required()
      .label(title.toLowerCase())

    if (options.required === false) {
      formSchema = formSchema.allow('').optional()
    }

    if (typeof min === 'number' && typeof min === 'number') {
      formSchema = formSchema.ruleset
    }

    if (typeof min === 'number') {
      formSchema = formSchema.min(min)
    }

    if (typeof max === 'number') {
      formSchema = formSchema.max(max)
    }

    const { maxWords, customValidationMessage } = def.options
    const isRequired = def.options.required ?? true

    if (!isRequired) {
      formSchema = formSchema.allow('').optional()
    }

    if (max) {
      formSchema = formSchema.max(max)
      this.isCharacterOrWordCount = true
    }

    if (min) {
      formSchema = formSchema.min(min)
    }

    if (maxWords ?? false) {
      formSchema = formSchema.custom((value, helpers) => {
        if (inputIsOverWordCount(value, maxWords)) {
          helpers.error('string.maxWords')
        }
        return value
      }, 'max words validation')
      this.isCharacterOrWordCount = true
    }

    if (customValidationMessage) {
      formSchema = formSchema.rule({
        message: customValidationMessage
      })
    }

    this.formSchema = formSchema
    this.stateSchema = formSchema
    this.schema = schema
    this.options = options
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
