declare module '@defra/hapi-tracing' {
  import { type Plugin } from '@hapi/hapi'

  export const tracing: {
    plugin: Plugin<{ tracingHeader?: string }>
  }
  export function getTraceId(): string | null
}
