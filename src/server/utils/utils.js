import { getAvailableLanguages } from '@defra/forms-engine-plugin'
import { getTraceId } from '@defra/hapi-tracing'

import { config } from '~/src/config/index.js'
import { EN_GB } from '~/src/server/constants.js'

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
 * @param { RequestQuery | undefined } query - the request query parameters
 * @param {Yar} [yar] - the yar instance from the request
 * @returns {string} - the resolved language code
 */
export function resolveLanguage(query, yar) {
  const defaultLang = EN_GB

  query ??= {}

  // yar.id is only set once yar's session has been initialised (onPreAuth),
  // so calling yar.get/set beforehand (e.g. for a 404 raised pre-routing)
  // would throw as its internal store is still null
  const sessionReady = yar && Boolean(yar.id)

  if (sessionReady && 'language' in query) {
    yar.set('language', query.language)
  }

  return (sessionReady ? yar.get('language') : null) ?? defaultLang
}

/**
 * Determine if the specified language has any translations available
 * @param {string} language
 * @param { FormDefinition | undefined } definition
 */
export function isLanguageSupported(language, definition) {
  // @ts-expect-error - dynamic language lookup
  return definition?.metadata?.translations?.[language] !== undefined
}

/**
 * Get a list of all languages supported by the system.
 * Primarily for pages that are not form-specific e.g. error pages
 */
export function getAllLanguages() {
  // Passing metadata that contains a Welsh translation construct will
  // cause both English and Welsh to be returned
  return getAvailableLanguages(
    /** @type {FormDefinition} */ (
      /** @type {unknown} */
      ({ metadata: { translations: { cy: {} } } })
    )
  )
}

/**
 * @import { RequestQuery } from '@hapi/hapi'
 * @import { Yar } from '@hapi/yar'
 * @import { FormDefinition } from '@defra/forms-model'
 */
