import { getTraceId } from '@defra/hapi-tracing'

import { config } from '~/src/config/index.js'

/**
 * Returns a set of headers to use in an HTTP request.
 * @returns {Parameters<typeof Wreck.request>[2]}
 */
export function getHeaders() {
  const traceId = getTraceId()
  const tracingHeader = config.get('tracing').header

  return {
    headers: traceId && tracingHeader ? { [tracingHeader]: traceId } : undefined
  }
}

/**
 * @import Wreck from '@hapi/wreck'
 */
