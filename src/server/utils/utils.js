import { getTraceId } from '@defra/hapi-tracing'

import { config } from '~/src/config/index.js'

/**
 * Returns a set of headers to use in an HTTP request, merging them with any existing headers in options.
 * @param {Record<string, string> | undefined} [existingHeaders] - Optional existing headers to merge with the tracing headers.
 * @param {string} [header] - The tracing header name to use.
 * @returns {Record<string, string> | undefined} The merged headers, or undefined if no tracing header is available.
 */
export function applyTraceHeaders(
  existingHeaders,
  header = config.get('tracing').header
) {
  if (!header) {
    return existingHeaders
  }

  const traceId = getTraceId()

  const headers = traceId ? { [header]: traceId } : undefined

  return existingHeaders ? Object.assign(existingHeaders, headers) : headers
}

/**
 * @param {string} formId - the source form id (not the feedback form id)
 * @returns {{ feedbackLink: string }}
 */
export function getFeedbackFormLink(formId) {
  return { feedbackLink: `/form/feedback?formId=${formId}` }
}

/**
 * Extracts the path of the calling page
 * @param {AnyFormRequest} request
 */
export function getCallingPath(request) {
  const url = new URL(request.headers?.referer ?? request.url)
  return url.pathname
}

/**
 * @import { AnyFormRequest } from '@defra/forms-engine-plugin/engine/types.js'
 */
