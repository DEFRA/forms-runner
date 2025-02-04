import { type SubmitResponsePayload } from '@defra/forms-model'

import { getAnswer } from '~/src/server/plugins/engine/components/helpers.js'
import { type checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'

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
      schemaVersion: '1',
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
 *          componentName: 'componentValue'
 *        }
 *      ]
 *    }
 * }
 */
function categoriseData(items: DetailItem[]) {
  const output: {
    main: Record<string, string>
    repeaters: Record<string, Record<string, string>[]>
  } = { main: {}, repeaters: {} }

  items.forEach((item) => {
    if ('subItems' in item) {
      const repeaters: Record<string, string>[] = []

      item.subItems.forEach((subItem) => {
        const repeaterEntry: Record<string, string> = {}

        subItem.forEach((subSubitem) => {
          repeaterEntry[subSubitem.name] = getAnswer(
            subSubitem.field,
            item.state,
            {
              format: 'data'
            }
          )
        })

        repeaters.push(repeaterEntry)
      })

      output.repeaters[item.name] = repeaters
    } else {
      output.main[item.name] = getAnswer(item.field, item.state, {
        format: 'data'
      })
    }
  })

  return output
}
