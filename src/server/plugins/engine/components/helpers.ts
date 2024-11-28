import { ComponentType, type ComponentDef } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { type ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import * as Components from '~/src/server/plugins/engine/components/index.js'
import { type FormState } from '~/src/server/plugins/engine/types.js'

const designerUrl = config.get('designerUrl')

// All component instances
export type Component = InstanceType<
  (typeof Components)[keyof typeof Components]
>

// Field component instances only
export type Field = InstanceType<
  | typeof Components.AutocompleteField
  | typeof Components.CheckboxesField
  | typeof Components.DatePartsField
  | typeof Components.EmailAddressField
  | typeof Components.MonthYearField
  | typeof Components.MultilineTextField
  | typeof Components.NumberField
  | typeof Components.SelectField
  | typeof Components.TelephoneNumberField
  | typeof Components.TextField
  | typeof Components.UkAddressField
  | typeof Components.FileUploadField
>

/**
 * Create field instance for each {@link ComponentDef} type
 */
export function createComponent(
  def: ComponentDef,
  options: ConstructorParameters<typeof ComponentBase>[1]
): Component {
  let component: Component | undefined

  switch (def.type) {
    case ComponentType.AutocompleteField:
      component = new Components.AutocompleteField(def, options)
      break

    case ComponentType.CheckboxesField:
      component = new Components.CheckboxesField(def, options)
      break

    case ComponentType.DatePartsField:
      component = new Components.DatePartsField(def, options)
      break

    case ComponentType.Details:
      component = new Components.Details(def, options)
      break

    case ComponentType.EmailAddressField:
      component = new Components.EmailAddressField(def, options)
      break

    case ComponentType.Html:
      component = new Components.Html(def, options)
      break

    case ComponentType.InsetText:
      component = new Components.InsetText(def, options)
      break

    case ComponentType.List:
      component = new Components.List(def, options)
      break

    case ComponentType.MultilineTextField:
      component = new Components.MultilineTextField(def, options)
      break

    case ComponentType.NumberField:
      component = new Components.NumberField(def, options)
      break

    case ComponentType.RadiosField:
      component = new Components.RadiosField(def, options)
      break

    case ComponentType.SelectField:
      component = new Components.SelectField(def, options)
      break

    case ComponentType.TelephoneNumberField:
      component = new Components.TelephoneNumberField(def, options)
      break

    case ComponentType.TextField:
      component = new Components.TextField(def, options)
      break

    case ComponentType.UkAddressField:
      component = new Components.UkAddressField(def, options)
      break

    case ComponentType.YesNoField:
      component = new Components.YesNoField(def, options)
      break

    case ComponentType.MonthYearField:
      component = new Components.MonthYearField(def, options)
      break

    case ComponentType.FileUploadField:
      component = new Components.FileUploadField(def, options)
      break
  }

  if (typeof component === 'undefined') {
    throw new Error(`Component type ${def.type} does not exist`)
  }

  return component
}

/**
 * Get formatted answer for a field
 */
export function getAnswer(
  field: Field,
  state: FormState,
  options: {
    format:
      | 'data' // Submission data
      | 'markdown' // GOV.UK Notify emails
      | 'summary' // Check answers summary
  } = { format: 'summary' }
) {
  // Use escaped display text for GOV.UK Notify emails
  if (options.format === 'markdown') {
    return getAnswerMarkdown(field, state)
  }

  // Use context value for submission data
  if (options.format === 'data') {
    const context = field.getContextValueFromState(state)
    return context?.toString() ?? ''
  }

  // Use display text for check answers summary
  return field.getDisplayStringFromState(state)
}

/**
 * Get formatted answer for a field (Markdown only)
 */
export function getAnswerMarkdown(field: Field, state: FormState) {
  const answer = field.getDisplayStringFromState(state)

  // Use escaped display text
  let answerEscaped = escapeAnswer(answer)

  if (field instanceof Components.FileUploadField) {
    const files = field.getFormValueFromState(state)

    // Skip empty files
    if (!files?.length) {
      return answerEscaped
    }

    answerEscaped = `${answer}:\n\n`

    // Append bullet points
    for (const { status } of files) {
      answerEscaped += `* [${status.form.file.filename}](${designerUrl}/file-download/${status.form.file.fileId})\n`
    }
  }

  return answerEscaped
}

/**
 * Prevent Markdown formatting
 */
export function escapeAnswer(answer: string) {
  return `\`\`\`\n${answer}\n\`\`\`\n`
}

export const addClassOptionIfNone = (
  options: Extract<ComponentDef, { options: { classes?: string } }>['options'],
  className: string
) => {
  if (!options.classes) {
    options.classes = className
  }
}
