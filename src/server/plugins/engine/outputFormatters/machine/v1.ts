import { type SubmitResponsePayload } from '@defra/forms-model'

import { getAnswer } from '~/src/server/plugins/engine/components/helpers.js'
import { type checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type DetailItem,
  type DetailItemField
} from '~/src/server/plugins/engine/models/types.js'

export function format(
  items: DetailItem[],
  model: FormModel,
  _submitResponse: SubmitResponsePayload,
  _formStatus: ReturnType<typeof checkFormStatus>
) {
  const now = new Date()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const itemsRendered = Object.fromEntries(items.map(renderDetailItem))

  const data = {
    meta: {
      schemaVersion: '1',
      timestamp: now.toISOString(),
      definition: model.def
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    data: itemsRendered
  }

  const body = JSON.stringify(data)

  return body
}

function renderDetailItem(item: DetailItem) {
  if ('subItems' in item) {
    return [
      item.name,
      item.subItems.map((subitem) =>
        Object.fromEntries(subitem.map(getItemEntry))
      )
    ]
  } else {
    return getItemEntry(item)
  }
}

/**
 * Get an entry compatible with Object.fromEntries
 */
function getItemEntry(item: DetailItemField): [string, string] {
  return [
    item.name,
    getAnswer(item.field, item.state, {
      format: 'data'
    })
  ]
}
