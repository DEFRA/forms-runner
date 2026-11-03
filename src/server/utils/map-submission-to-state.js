import { randomUUID } from 'node:crypto'

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
 * For escaping filenames and file labels.
 *
 * Notify auto-translates ASCII hyphens to en dashes (where used to split a sentence), and strips whitespace (including tabs)
 * before punctuation.
 * This method is used to escape each of these characters so Notify doesn't translate the content.
 *
 * NOTE: hyphens are not converted because we are forcing '&nbsp;' in the surrounding spaces (if any), therefore Notify doesn't think
 * it's a sentence break.
 * @param {string} str - Gracefully handles null, undefined and non-string values.
 */
export function escapeFileLabel(str) {
  if (!isString(str)) {
    return ''
  }
  return str
    .replaceAll(' ', '&nbsp;')
    .replaceAll('\t', '&nbsp;&nbsp;&nbsp;&nbsp;')
}

// /**
//  *
//  * @param {FormAdapterFile} file
//  * @returns {FileState}
//  */
// function mapFormAdapterFileToFileState(file) {
//   const status = /** @type {UploadStatusFileResponse} */ ({
//     form: {
//       file: {
//         contentLength: 0,
//         fileStatus: FileStatus.complete,
//         fileId: file.fileId,
//         filename: escapeFileLabel(file.fileName)
//       }
//     },
//     uploadStatus: UploadStatus.ready,
//     metadata: {
//       retrievalKey: ''
//     }
//   })

//   return {
//     status,
//     uploadId: 'f1ee2837-7581-4cb0-8113-134527250fee'
//   }
// }

/**
 * Turns a form submission document into data suitable for session state
 * @param {FormSubmissionDocument} formSubmissionMessage
 */
export function mapValueToState(formSubmissionMessage) {
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

  // const fileEntries = Object.entries(formSubmissionMessage.data.files)
  // const files = fileEntries.reduce((fileObject, [key, value]) => {
  //   const componentFiles = value.map(mapFormAdapterFileToFileState)
  //   return {
  //     ...fileObject,
  //     [key]: componentFiles
  //   }
  // }, {})

  return {
    ...main,
    ...repeaters
  }
}

/**
 * @import { RichFormValue, FormStateValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormSubmissionDocument } from '~/src/server/services/submissionService.js'
 */
