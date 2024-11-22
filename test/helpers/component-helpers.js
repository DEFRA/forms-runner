import { within } from '@testing-library/dom'

import { render } from '~/src/server/plugins/nunjucks/index.js'

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
 * Render Nunjucks macro into DOM
 * @param {Parameters<typeof render.macro>} args
 */
export function renderMacro(...args) {
  return renderDOM(render.macro(...args))
}

/**
 * Render Nunjucks view into DOM
 * @param {Parameters<typeof render.view>} args
 */
export function renderView(...args) {
  return renderDOM(render.view(...args))
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

  const result = renderDOM(response.result)
  return { ...result, response }
}

/**
 * Render DOM
 * @param {string} [html]
 */
export function renderDOM(html = '') {
  const { window } = globalThis.$jsdom

  // Update the document body
  window.document.body.innerHTML = html

  const document = window.document
  const container = within(document.body)

  return { container, document }
}

/**
 * @import { Server, ServerInjectOptions, ServerInjectResponse } from '@hapi/hapi'
 * @import { FormPayload, FormState, FormValue } from '~/src/server/plugins/engine/types.js'
 */
