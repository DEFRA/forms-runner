import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import { type FormParams } from '@defra/forms-engine-plugin/types'
import {
  type Request,
  type ResponseToolkit,
  type ServerRegisterPluginObject
} from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'

import {
  interpretError,
  isFormConfigurationError
} from '~/src/server/plugins/errorInterpretation.js'
import { getAllLanguages, resolveLanguage } from '~/src/server/utils/utils.js'

const HTTP_ERROR_RANGE_START = 500
const HTTP_ERROR_RANGE_END = 511

/**
 * Determines if the error sits within the 5xx server error range
 * @param statusCode
 * @returns {boolean}
 */
export function isServerError(statusCode: number): boolean {
  return (
    statusCode >= HTTP_ERROR_RANGE_START && statusCode <= HTTP_ERROR_RANGE_END
  )
}

/*
 * Add an `onPreResponse` listener to return error pages
 */
export default {
  plugin: {
    name: 'error-pages',
    register(server) {
      server.ext('onPreResponse', (request: Request, h: ResponseToolkit) => {
        const response = request.response

        if ('isBoom' in response && response.isBoom) {
          // An error was raised during
          // processing the request
          const statusCode = response.output.statusCode

          // Check for a form model on the request
          // and use it to set the correct service name
          // and start page path. In the event of a error
          // happening inside a "form" level request, the header
          // then displays the contextual form text and href
          const model = request.app.model
          const language = resolveLanguage(request.query, request.yar)
          const languages = getAllLanguages()
          const viewModelBase = model
            ? {
                name: model.name,
                serviceUrl: `/${model.basePath}`
              }
            : {}
          const viewModel = {
            ...viewModelBase,
            languages,
            language,
            currentPath: request.path,
            translator: {
              language,
              languages
            }
          }

          // In the event of 404
          // return the `404` view
          if (statusCode === StatusCodes.NOT_FOUND.valueOf()) {
            return h.view('404', viewModel).code(statusCode)
          }

          const error = new Error(
            `HTTP ${statusCode} error: ${response.message}`
          )
          // Preserve the original stack trace from the Boom error
          // In the unlikely event that the Boom error has no stack trace,
          // fall back to the locally created error's stack trace.
          error.stack = response.stack ?? error.stack

          const message = `[httpError] HTTP ${statusCode} error occurred - ${response.message} - path: ${request.path} - method: ${request.method}`
          // Log server errors as 'error'
          if (isServerError(statusCode)) {
            request.logger.error(error, message)
          } else {
            // Any other errors as 'info'
            request.logger.info(message)
          }

          const { isPreview } = checkFormStatus(request.params as FormParams)

          // Only show the preview error page for known form-configuration
          // problems. A generic failure (an outage, a bug) must not be
          // dressed up as a problem with the form.
          if (
            isPreview &&
            statusCode >= StatusCodes.INTERNAL_SERVER_ERROR.valueOf() &&
            isFormConfigurationError(response)
          ) {
            // This page is English-only, so hide the language toggle
            return h
              .view('500-preview', {
                ...viewModel,
                errorDetails: interpretError(response),
                languages: [],
                translator: undefined
              })
              .code(statusCode)
          }

          return h.view('500', viewModel).code(statusCode)
        }
        return h.continue
      })
    }
  }
} satisfies ServerRegisterPluginObject<void>
