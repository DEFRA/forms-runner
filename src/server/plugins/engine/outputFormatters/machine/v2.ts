import { type SubmitResponsePayload } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { type DatePartsState } from '~/src/server/plugins/engine/components/DatePartsField.js'
import { type MonthYearState } from '~/src/server/plugins/engine/components/MonthYearField.js'
import { type UkAddressState } from '~/src/server/plugins/engine/components/UkAddressField.js'
import { FileUploadField } from '~/src/server/plugins/engine/components/index.js'
import { type checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type DetailItem,
  type DetailItemField,
  type DetailItemRepeat
} from '~/src/server/plugins/engine/models/types.js'
import {
  type FormPayload,
  type FormValue
} from '~/src/server/plugins/engine/types.js'

const designerUrl = config.get('designerUrl')

export function format(
  items: DetailItem[],
  model: FormModel,
  _submitResponse: SubmitResponsePayload,
  _formStatus: ReturnType<typeof checkFormStatus>
) {
  const now = new Date()

  const categorisedData = categoriseData(items)

  const data = {
    meta: {
      schemaVersion: '2',
      timestamp: now.toISOString(),
      definition: model.def
    },
    data: categorisedData
  }

  const body = JSON.stringify(data)

  return body
}

/**
 * Categories the form submission data into the "main" body and "repeaters".
 *
 * {
 *    main: {
 *       componentName: 'componentValue',
 *    },
 *    repeaters: {
 *      repeaterName: [
 *        {
 *          textComponentName: 'componentValue'
 *        },
 *        {
 *          richComponentName: { foo: 'bar', 'baz': true }
 *        }
 *      ]
 *    },
 *    files: {
 *      fileComponentName: [
 *        {
 *          fileId: '123-456-789',
 *          link: 'https://forms-designer/file-download/123-456-789'
 *        }
 *      ]
 *    }
 * }
 */
function categoriseData(items: DetailItem[]) {
  const output: {
    main: Record<string, RichFormValue>
    repeaters: Record<string, Record<string, RichFormValue>[]>
    files: Record<string, Record<string, string>[]>
  } = { main: {}, repeaters: {}, files: {} }

  items.forEach((item) => {
    const { name, state } = item

    if ('subItems' in item) {
      output.repeaters[name] = extractRepeaters(item)
    } else if (isFileUploadFieldItem(item)) {
      output.files[name] = extractFileUploads(item)
    } else {
      output.main[name] = item.field.getFormValueFromState(state)
    }
  })

  return output
}

/**
 * Returns the "repeaters" section of the response body
 * @param item - the repeater item
 * @returns the repeater item
 */
function extractRepeaters(item: DetailItemRepeat) {
  const repeaters: Record<string, RichFormValue>[] = []

  item.subItems.forEach((inputRepeaterItem) => {
    const outputRepeaterItem: Record<string, RichFormValue> = {}

    inputRepeaterItem.forEach((repeaterComponent) => {
      const { field, state } = repeaterComponent

      outputRepeaterItem[repeaterComponent.name] =
        field.getFormValueFromState(state)
    })

    repeaters.push(outputRepeaterItem)
  })

  return repeaters
}

/**
 * Returns the "files" section of the response body
 * @param item - the file upload item in the form
 * @returns the file upload data
 */
function extractFileUploads(item: FileUploadFieldDetailitem) {
  const fileUploadState = item.field.getContextValueFromState(item.state) ?? []

  return fileUploadState.map((fileId) => {
    return {
      fileId,
      userDownloadLink: `${designerUrl}/file-download/${fileId}`
    }
  })
}

function isFileUploadFieldItem(
  item: DetailItemField
): item is FileUploadFieldDetailitem {
  return item.field instanceof FileUploadField
}

/**
 * A detail item specifically for files
 */
type FileUploadFieldDetailitem = Omit<DetailItemField, 'field'> & {
  field: FileUploadField
}

type RichFormValue =
  | FormValue
  | FormPayload
  | DatePartsState
  | MonthYearState
  | UkAddressState
