declare module '@defra/hapi-tracing' {
  import { type Plugin } from '@hapi/hapi'

  export const tracing: Plugin<unknown>
  export function getTraceId(): string | null
}
