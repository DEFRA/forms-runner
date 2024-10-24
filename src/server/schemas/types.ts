import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'

export interface Field {
  key: string
  type: DetailItem['dataType']
  title: DetailItem['title']
  answer: DetailItem['rawValue']
  item: DetailItem
}
