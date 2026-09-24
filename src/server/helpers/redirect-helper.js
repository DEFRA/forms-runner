import { StatusCodes } from 'http-status-codes'

import { addErrorsToSession } from '~/src/server/helpers/error-helper.js'

/**
 * @template T, S
 * @param { Request | Request<{ Params: S }> | Request<{ Payload: T }> | Request<{ Params: S, Payload: T }> } request
 * @param { ResponseToolkit | ResponseToolkit<{ Params: S }> | ResponseToolkit<{ Payload: T }> | ResponseToolkit<{ Params: S, Payload: T }> } h
 * @param {Error | undefined} error
 * @param {ValidationSessionKey} errorKey
 * @param {MessageTranslator} messageTranslator
 * @param {string} [anchor]
 */
export function redirectWithErrors(
  request,
  h,
  error,
  errorKey,
  messageTranslator,
  anchor = ''
) {
  addErrorsToSession(request, errorKey, messageTranslator, error)
  const { pathname: redirectTo, search } = request.url
  return h
    .redirect(`${redirectTo}${search || ''}${anchor}`)
    .code(StatusCodes.SEE_OTHER)
    .takeover()
}

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 * @import { ValidationSessionKey } from '@hapi/yar'
 * @import { MessageTranslator } from '~/src/server/helpers/error-helper.js'
 */
