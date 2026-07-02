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
 * @param {RequestQuery} [query] - the request query parameters
 * @param {Yar} [yar] - the yar instance from the request
 * @param {FormMetadata} [metadata] - the form metadata
 */
export function resolveLanguage(query = {}, yar, metadata) {
  const defaultLang = 'en-GB'

  if (yar && 'language' in query) {
    yar.set('language', query.language)
  }

  return (
    yar?.get('language') ??
    // @ts-expect-error - 'language' not part of FormMetadata yet
    metadata?.language ??
    defaultLang
  )
}

/**
 * @import { RequestQuery } from '@hapi/hapi'
 * @import { Yar } from '@hapi/yar'
 * @import { FormMetadata } from '@defra/forms-model'
 */
