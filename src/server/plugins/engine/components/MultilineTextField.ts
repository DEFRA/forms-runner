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

    const { schema, options, title } = def

    const isRequired = options.required !== false

    let formSchema = Joi.string().label(title.toLowerCase())

    if (isRequired) {
      formSchema = formSchema.required()
    } else {
      formSchema = formSchema.allow('').allow(null)
    }

    formSchema = formSchema.ruleset

    if (typeof schema.max === 'number') {
      formSchema = formSchema.max(schema.max)
      this.isCharacterOrWordCount = true
    }

    if (typeof schema.min === 'number') {
      formSchema = formSchema.min(schema.min)
    }

    if (typeof options.maxWords === 'number') {
      const { maxWords } = options

      formSchema = formSchema.custom((value: string, helpers) => {
        if (inputIsOverWordCount(value, maxWords)) {
          helpers.error('string.maxWords')
        }
        return value
      }, 'max words validation')

      this.isCharacterOrWordCount = true
    }

    if (options.customValidationMessage) {
      formSchema = formSchema.rule({
        message: options.customValidationMessage
      })
    }

    this.formSchema = formSchema
    this.options = options
    this.schema = schema
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
