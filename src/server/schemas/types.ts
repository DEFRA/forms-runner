import { type DataType } from '~/src/server/plugins/engine/components/types.js'
import {
  type DetailItemBase,
  type DetailItemField,
  type DetailItemRepeat
} from '~/src/server/plugins/engine/models/types.js'

export interface FieldSummary<
  DetailItemType extends DetailItemBase = DetailItemField | DetailItemRepeat
> {
  key: string
  type?: DataType
  title: string
  answer: DetailItemType['rawValue']
  item: DetailItemType
}
