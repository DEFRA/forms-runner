import { randomUUID } from 'node:crypto'

import { createComponent } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
import { hasFormComponents } from '@defra/forms-model'

/**
 * Handles sub fields like address.addressLine1 and date.day
 * @param {Record<string, FormStateValue>} subfieldObject
 * @param {[string, RichFormValue|null]} entry
 * @returns {Record<string, FormStateValue>}
 */
function handleSubfields(subfieldObject, [key, value]) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const subValues = Object.entries(value).reduce((acc2, [key2, value2]) => {
      if (value2 === undefined) {
        return acc2
      }
      return {
        ...acc2,
        [`${key}__${key2}`]: value2
      }
    }, {})

    return {
      ...subfieldObject,
      ...subValues
    }
  }

  if (value === undefined) {
    return subfieldObject
  }

  return {
    ...subfieldObject,
    [key]: value
  }
}

/**
 * Checks if a value is a string.
 * @param {unknown} value - The value to check.
 * @returns {value is string} True if the value is a string.
 */
export const isString = (value) => typeof value === 'string'

/**
 * Turns a form submission document into data suitable for session state
 * @param {FormSubmissionDocument} formSubmissionMessage
 * @param {FormDefinition} definition
 */
export function mapValueToState(formSubmissionMessage, definition) {
  const mainEntries = Object.entries(formSubmissionMessage.data.main)
  const main = mainEntries.reduce(
    (acc, entry) => handleSubfields(acc, entry),
    /** @type {Record<string, FormStateValue>} */ ({})
  )

  const repeaterEntries = Object.entries(formSubmissionMessage.data.repeaters)
  const repeaters = repeaterEntries.reduce((repeaterObject, [key, value]) => {
    const values = value.map((repeater) => {
      const reduced = Object.entries(repeater).reduce(
        (acc, entry) => handleSubfields(acc, entry),
        /** @type {Record<string, FormStateValue>} */ ({})
      )
      return {
        ...reduced,
        itemId: randomUUID()
      }
    })

    return {
      ...repeaterObject,
      [key]: values
    }
  }, {})

  return {
    ...main,
    // Rehydrate any missing null-value fields from repeaters
    ...rehydrateRepeaters(repeaters, definition)
  }
}

/**
 * Rehydrates repeater fields with missing null-value fields based on the form definition.
 * These are required (even though they may be option fields) for repeater validation to work correctly.
 * @param {Record<string, Record<string, RichFormValue>[]>} repeaters
 * @param {FormDefinition} definition
 */
export function rehydrateRepeaters(repeaters, definition) {
  const repeaterPages = definition.pages.filter(
    (p) => hasFormComponents(p) && 'repeat' in p
  )

  /** @type {Record<string, Record<string, RichFormValue | null>[]>} */
  const rehydrated = { ...repeaters }

  for (const page of repeaterPages) {
    // @ts-expect-error: page.repeat may be undefined, but we handle it with optional chaining
    const name = page.repeat?.options.name
    const items = name ? repeaters[name] : undefined

    if (!name || !Array.isArray(items)) {
      continue
    }

    const components = page.components

    rehydrated[name] = items.map((item) => {
      /** @type {Record<string, RichFormValue | null>} */
      const rehydratedItem = { ...item }

      for (const component of components) {
        const field = createComponent(component, {
          // @ts-expect-error: partial implementation of model as extra data not required for simple component creation
          model: { getList: () => undefined }
        })
        const fieldNames = (field.collection?.fields ?? [field]).map(
          (f) => f.name
        )
        for (const fieldName of fieldNames) {
          rehydratedItem[fieldName] ??= null
        }
      }

      return rehydratedItem
    })
  }

  return rehydrated
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 * @import { RichFormValue, FormStateValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormSubmissionDocument } from '~/src/server/services/submissionService.js'
 */
