import {
  type ConditionWrapper,
  type FormComponentsDef
} from '@defra/forms-model'
import { type Expression } from 'expr-eval'

import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FormPayload,
  type FormState,
  type FormValue
} from '~/src/server/plugins/engine/types.js'

export type ExecutableCondition = ConditionWrapper & {
  expr: Expression
  fn: (state: FormState) => boolean
}

/**
 * Used to render a row on a Summary List (check your answers)
 */
export interface DetailItem {
  name: string
  title: string
  label?: string
  value: string
  markdownValue?: string
  rawValue: FormValue | FormPayload
  type?: FormComponentsDef['type']
  page: PageControllerClass
  url: string
  inError?: boolean
  subItems?: DetailItem[][]
}

/**
 * Used to render a row on a Summary List (check your answers)
 */
export interface Detail {
  name?: string
  title?: string
  items: DetailItem[]
}
