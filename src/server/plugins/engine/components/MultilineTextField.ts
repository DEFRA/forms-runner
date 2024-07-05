import { type MultilineTextFieldComponent } from '@defra/forms-model'
import Joi from 'joi'

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
    this.options = def.options
    this.schema = def.schema

    const { maxWords, customValidationMessage } = def.options
    const isRequired = def.options.required ?? true

    let formSchema = Joi.string().label(def.title.toLowerCase())

    if (isRequired) {
      formSchema = formSchema.required()
    } else {
      formSchema = formSchema.allow('').allow(null)
    }

    formSchema = formSchema.ruleset

    if (def.schema.max) {
      formSchema = formSchema.max(def.schema.max)
      this.isCharacterOrWordCount = true
    }

    if (def.schema.min) {
      formSchema = formSchema.min(def.schema.min)
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
