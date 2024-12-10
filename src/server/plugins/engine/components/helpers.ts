import { ComponentType, type ComponentDef } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { type ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
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
      | 'email' // GOV.UK Notify emails
      | 'summary' // Check answers summary
  } = { format: 'summary' }
) {
  // Use escaped display text for GOV.UK Notify emails
  if (options.format === 'email') {
    return getAnswerMarkdown(field, state, { format: 'email' })
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
export function getAnswerMarkdown(
  field: Field,
  state: FormState,
  options: {
    format:
      | 'email' // GOV.UK Notify emails
      | 'summary' // Check answers summary
  } = { format: 'summary' }
) {
  const answer = field.getDisplayStringFromState(state)

  // Use escaped display text
  let answerEscaped = `${escapeMarkdown(answer)}\n`

  if (field instanceof Components.FileUploadField) {
    const files = field.getFormValueFromState(state)

    // Skip empty files
    if (!files?.length) {
      return answerEscaped
    }

    answerEscaped = `${escapeMarkdown(answer)}:\n\n`

    // Append bullet points
    answerEscaped += files
      .map(({ status }) => {
        const { file } = status.form
        const filename = escapeMarkdown(file.filename)
        return `* [${filename}](${designerUrl}/file-download/${file.fileId})\n`
      })
      .join('')
  } else if (field instanceof ListFormComponent) {
    const values = [field.getContextValueFromState(state)].flat()
    const items = field.items.filter(({ value }) => values.includes(value))

    // Skip empty values
    if (!items.length) {
      return answerEscaped
    }

    answerEscaped = ''

    // Append bullet points
    answerEscaped += items
      .map((item) => {
        const label = escapeMarkdown(item.text)
        const value = escapeMarkdown(`(${item.value})`)

        let line = label

        // Prepend bullet points for checkboxes only
        if (field instanceof Components.CheckboxesField) {
          line = `* ${line}`
        }

        // Append raw values in parentheses
        // e.g. `* None of the above (false)`
        return options.format === 'email' &&
          `${item.value}`.toLowerCase() !== item.text.toLowerCase()
          ? `${line} ${value}\n`
          : `${line}\n`
      })
      .join('')
  } else if (field instanceof Components.MultilineTextField) {
    // Preserve Multiline text new lines
    answerEscaped = answer
      .split(/\r?\n/)
      .map(escapeMarkdown)
      .join('\n')
      .concat('\n')
  } else if (field instanceof Components.UkAddressField) {
    // Format UK addresses into new lines
    answerEscaped = (field.getContextValueFromState(state) ?? [])
      .map(escapeMarkdown)
      .join('\n')
      .concat('\n')
  }

  return answerEscaped
}

/**
 * Prevent Markdown formatting
 * @see {@link https://pandoc.org/chunkedhtml-demo/8.11-backslash-escapes.html}
 */
export function escapeMarkdown(answer: string) {
  const punctuation = [
    '`',
    "'",
    '*',
    '_',
    '{',
    '}',
    '[',
    ']',
    '(',
    ')',
    '#',
    '+',
    '-',
    '.',
    '!'
  ]

  for (const character of punctuation) {
    answer = answer.toString().replaceAll(character, `\\${character}`)
  }

  return answer
}

export const addClassOptionIfNone = (
  options: Extract<ComponentDef, { options: { classes?: string } }>['options'],
  className: string
) => {
  if (!options.classes) {
    options.classes = className
  }
}
