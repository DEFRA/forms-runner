import {
  requestTracing as requestTracingPlugin,
  setReferenceNumber
} from '@defra/forms-common'
import { tracing } from '@defra/hapi-tracing'

import { config } from '~/src/config/index.js'

const tracingHeader = config.get('tracing.header')

/**
 * Gets the unique account ID (`sub`) of the signed in citizen
 * @param {Request} request
 * @returns {string | undefined}
 */
export function getRequestUserId(request) {
  const { credentials, isAuthenticated } = request.auth

  if (!isAuthenticated) {
    return undefined
  }

  return credentials.sub
}

/**
 * Gets the ID of the yar session, which the session plugin loads in `onPreAuth`.
 * The form state of `@defra/forms-engine-plugin` is stored against this ID.
 * @param {Request} request
 * @returns {string | null | undefined}
 */
export function getRequestSessionId(request) {
  // `request.yar` is only set when the yar plugin is registered
  const { yar } = /** @type {Partial<Pick<Request, 'yar'>>} */ (request)

  return yar?.id
}

/**
 * `onRequest` callback of `@defra/forms-engine-plugin` that adds the
 * reference number of the form being completed to the log context. The
 * engine calls it once it has loaded the form state, before the page handler.
 * @param {AnyFormRequest} _request
 * @param {FormResponseToolkit} h
 * @param {FormContext} context
 */
export function addReferenceNumberToLogContext(_request, h, context) {
  setReferenceNumber(context.referenceNumber)

  return h.continue
}

/**
 * Starts a log context for every request, holding the correlation ID from the
 * tracing header (or a new ID when the caller sent none), the account ID of
 * the signed in citizen and the ID of the yar session. The logger writes them
 * on every log line.
 *
 * The plugin registers `@defra/hapi-tracing`, so `@defra/forms-engine-plugin`
 * reports the same correlation ID.
 * @satisfies {ServerRegisterPluginObject<RequestTracingOptions>}
 */
export const requestTracing = {
  plugin: requestTracingPlugin,
  options: {
    tracingHeader,
    tracingPlugin: tracing.plugin,
    getUserId: getRequestUserId,
    getSessionId: getRequestSessionId
  }
}

/**
 * @import { RequestTracingOptions } from '@defra/forms-common'
 * @import { AnyFormRequest, FormContext, FormResponseToolkit } from '@defra/forms-engine-plugin/types'
 * @import { Request, ServerRegisterPluginObject } from '@hapi/hapi'
 */
