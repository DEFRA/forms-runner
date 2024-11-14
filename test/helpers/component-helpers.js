import { within } from '@testing-library/dom'

/**
 * Get component form data
 * @param {FormValue} [value]
 * @param {string} [name]
 * @returns {FormPayload}
 */
export function getFormData(value, name = 'myComponent') {
  return typeof value !== 'undefined' ? { [name]: value } : {}
}

/**
 * Get component session state
 * @param {FormValue | null} [value]
 * @param {string} [name]
 * @returns {FormState}
 */
export function getFormState(value, name = 'myComponent') {
  return { [name]: value ?? null }
}

/**
 * Render HTTP response
 * @param {Server} server
 * @param {ServerInjectOptions} options
 */
export async function renderResponse(server, options) {
  const response = /** @type {ServerInjectResponse<string>} */ (
    await server.inject(options)
  )

  const { document } = renderDOM(response.result)
  const container = within(document.body)

  return { container, response }
}

/**
 * Render DOM
 * @param {string} [html]
 */
export function renderDOM(html = '') {
  const { window } = globalThis.$jsdom

  // Update the document body
  window.document.body.innerHTML = html

  return window
}

/**
 * @import { Server, ServerInjectOptions, ServerInjectResponse } from '@hapi/hapi'
 * @import { FormPayload, FormState, FormValue } from '~/src/server/plugins/engine/types.js'
 */
