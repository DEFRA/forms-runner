import { getTraceId } from '@defra/hapi-tracing'

import { config } from '~/src/config/index.js'

const tracingHeader = config.get('tracing').header

/**
 * Returns a set of headers to use in an HTTP request, merging them with any existing headers in options.
 * @param {Record<string, string> | undefined} [existingHeaders] - Optional existing headers to merge with the tracing headers.
 * @returns {Record<string, string> | undefined} The merged headers, or undefined if no tracing header is available.
 */
export function applyTraceHeaders(existingHeaders) {
  if (!tracingHeader) {
    return existingHeaders
  }

  const traceId = getTraceId()

  const headers = traceId ? { [tracingHeader]: traceId } : undefined

  return existingHeaders ? Object.assign(existingHeaders, headers) : headers
}
