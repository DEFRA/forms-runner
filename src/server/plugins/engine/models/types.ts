import { type ConditionWrapper } from '@defra/forms-model'
import { type Expression } from 'expr-eval'

import { type FormComponentFieldClass } from '~/src/server/plugins/engine/components/helpers.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FormState,
  type FormStateValue
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
  rawValue: FormStateValue
  type?: FormComponentFieldClass['type']
  page: PageControllerClass
  inError?: boolean
  url: string
}

/**
 * Used to render a row on a Summary List (check your answers)
 */
export interface Detail {
  name?: string
  title?: string
  items: DetailItem[]
}
