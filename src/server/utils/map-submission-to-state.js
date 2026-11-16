import { randomUUID } from 'node:crypto'

/**
 * Handles sub fields like address.addressLine1 and date.day
 * @param {Record<string, FormStateValue>} subfieldObject
 * @param {[string, RichFormValue | null]} entry
 * @param {string[]} ignoreKeys - keys to ignore when copying state (e.g. declaration fields)
 * @returns {Record<string, FormStateValue>}
 */
function handleSubfields(subfieldObject, [key, value], ignoreKeys = []) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const subValues = Object.entries(value).reduce((acc2, [key2, value2]) => {
      if (value2 === undefined || ignoreKeys.includes(key2)) {
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

  if (value === undefined || ignoreKeys.includes(key)) {
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
 * @param {string[]} [ignoreKeys] - keys to ignore when copying state (e.g. declaration fields)
 */
export function mapValueToState(formSubmissionMessage, ignoreKeys = []) {
  const mainEntries = Object.entries(formSubmissionMessage.data.main)
  const main = mainEntries.reduce(
    (acc, entry) => handleSubfields(acc, entry, ignoreKeys),
    /** @type {Record<string, FormStateValue>} */ ({})
  )

  const repeaterEntries = Object.entries(formSubmissionMessage.data.repeaters)
  const repeaters = repeaterEntries.reduce((repeaterObject, [key, value]) => {
    const values = value.map((repeater) => {
      const reduced = Object.entries(repeater).reduce(
        (acc, entry) => handleSubfields(acc, entry, ignoreKeys),
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
    ...repeaters
  }
}

/**
 * @import { RichFormValue, FormStateValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormSubmissionDocument } from '~/src/server/services/submissionService.js'
 */
