import { getPluginOptions } from '@defra/forms-engine-plugin/engine/helpers.js'
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
 * @param {AnyFormRequest} request
 * @param {FormMetadata} [metadata]
 */
export function resolveLanguage(request, metadata) {
  // @ts-expect-error - dynamic lookup of plugin
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!request?.server?.['forms-engine-plugin']) {
    return metadata?.language ?? 'en-GB'
  }
  const { getLanguage } = getPluginOptions(request.server)
  return getLanguage?.(request, metadata) ?? 'en-GB'
}

/**
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { AnyFormRequest } from '@defra/forms-engine-plugin/types'
 */
