import { type FormPayload } from '~/src/server/plugins/engine/types.ts'

declare module 'joi' {
  interface Context {
    present?: string[]
    presentWithLabels?: string[]
    missing?: string[]
    missingWithLabels?: string[]
  }

  /**
   * Add context types for `object.and` error reports
   * {@link https://joi.dev/api/?v=17.13.3#objectand}
   */
  interface ErrorReportCollection extends ErrorReport {
    local: Context & {
      value: FormPayload
      label?: string
      title?: string
    }
  }

  interface JoiExpressionReturn {
    render: (p1, p2, p3, p4, p5) => string
  }

  type JoiExpression = JoiExpressionReturn | string

  type LanguageMessagesExt = Record<string, JoiExpression>
}
