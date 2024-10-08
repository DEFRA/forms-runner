import { JSDOM } from 'jsdom'

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

  return { response, document }
}

/**
 * Render DOM
 * @param {string | Buffer} [html]
 */
export function renderDOM(html) {
  return new JSDOM(html).window
}

/**
 * @import { Server, ServerInjectOptions, ServerInjectResponse } from '@hapi/hapi'
 */
