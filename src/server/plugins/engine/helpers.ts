import { ControllerPath, Engine } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'
import { format, parseISO } from 'date-fns'
import { StatusCodes } from 'http-status-codes'
import { type Schema, type ValidationErrorItem } from 'joi'
import upperFirst from 'lodash/upperFirst.js'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FormContextRequest,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'
import {
  FormAction,
  FormStatus,
  type FormQuery
} from '~/src/server/routes/types.js'

const logger = createLogger()

export function proceed(
  request: Pick<FormContextRequest, 'method' | 'payload' | 'query'>,
  h: Pick<ResponseToolkit, 'redirect' | 'view'>,
  nextUrl: string
) {
  const { method, payload, query } = request
  const { returnUrl } = query

  const isReturnAllowed =
    payload && 'action' in payload
      ? payload.action === FormAction.Continue ||
        payload.action === FormAction.Validate
      : false

  // Redirect to return location (optional)
  const response =
    isReturnAllowed && isPathRelative(returnUrl)
      ? h.redirect(returnUrl)
      : h.redirect(redirectPath(nextUrl))

  // Redirect POST to GET to avoid resubmission
  return method === 'post'
    ? response.code(StatusCodes.SEE_OTHER)
    : response.code(StatusCodes.MOVED_TEMPORARILY)
}

/**
 * Encodes a URL, returning undefined if the process fails.
 */
export function encodeUrl(link?: string) {
  if (link) {
    try {
      return new URL(link).toString() // escape the search params without breaking the ? and & reserved characters in rfc2368
    } catch (err) {
      logger.error(err, `Failed to encode ${link}`)
      throw err
    }
  }
}

/**
 * Get page href
 */
export function getPageHref(
  page: PageControllerClass,
  query?: FormQuery
): string

/**
 * Get page href by path
 */
export function getPageHref(
  page: PageControllerClass,
  path: string,
  query?: FormQuery
): string

export function getPageHref(
  page: PageControllerClass,
  pathOrQuery?: string | FormQuery,
  queryOnly: FormQuery = {}
) {
  const path = typeof pathOrQuery === 'string' ? pathOrQuery : page.path
  const query = typeof pathOrQuery === 'object' ? pathOrQuery : queryOnly

  if (!isPathRelative(path)) {
    throw Error(`Only relative URLs are allowed: ${path}`)
  }

  // Return path with page href as base
  return redirectPath(page.getHref(path), query)
}

/**
 * Get redirect path with optional query params
 */
export function redirectPath(nextUrl: string, query: FormQuery = {}) {
  const isRelative = isPathRelative(nextUrl)

  // Filter string query params only
  const params = Object.entries(query).filter(
    (query): query is [string, string] => typeof query[1] === 'string'
  )

  // Build URL with relative path support
  const url = isRelative
    ? new URL(nextUrl, 'http://example.com')
    : new URL(nextUrl)

  // Append query params
  for (const [name, value] of params) {
    url.searchParams.set(name, value)
  }

  if (isRelative) {
    return `${url.pathname}${url.search}`
  }

  return url.href
}

export function isPathRelative(path?: string) {
  return (path ?? '').startsWith('/')
}

export function normalisePath(path = '') {
  return path
    .trim() // Trim empty spaces
    .replace(/^\//, '') // Remove leading slash
    .replace(/\/$/, '') // Remove trailing slash
}

export function getPage(
  model: FormModel | undefined,
  request: FormContextRequest
) {
  const { params } = request

  const page = findPage(model, `/${params.path}`)

  if (!page) {
    throw Boom.notFound(`No page found for /${params.path}`)
  }

  return page
}

export function findPage(model: FormModel | undefined, path?: string) {
  const findPath = `/${normalisePath(path)}`
  return model?.pages.find(({ path }) => path === findPath)
}

export function getStartPath(model?: FormModel) {
  if (model?.engine === Engine.V2) {
    const startPath = normalisePath(model.def.pages.at(0)?.path)
    return startPath ? `/${startPath}` : ControllerPath.Start
  }

  const startPath = normalisePath(model?.def.startPage)
  return startPath ? `/${startPath}` : ControllerPath.Start
}

export function checkFormStatus(path: string) {
  const isPreview = path.toLowerCase().startsWith(PREVIEW_PATH_PREFIX)

  let state: FormStatus | undefined

  if (isPreview) {
    const previewState = path.split('/')[2]

    for (const formState of Object.values(FormStatus)) {
      if (previewState === formState.toString()) {
        state = formState
        break
      }
    }

    if (!state) {
      throw new Error(`Invalid form state: ${previewState}`)
    }
  }

  return {
    isPreview,
    state: state ?? FormStatus.Live
  }
}

export function checkEmailAddressForLiveFormSubmission(
  emailAddress: string | undefined,
  isPreview: boolean
) {
  if (!emailAddress && !isPreview) {
    throw Boom.internal(
      'An email address is required to complete the form submission'
    )
  }
}

/**
 * Parses the errors from {@link Schema.validate} so they can be rendered by govuk-frontend templates
 * @param [details] - provided by {@link Schema.validate}
 */
export function getErrors(
  details?: ValidationErrorItem[]
): FormSubmissionError[] | undefined {
  if (!details?.length) {
    return
  }

  return details.map(getError)
}

export function getError(detail: ValidationErrorItem): FormSubmissionError {
  const { context, message, path } = detail

  const name = context?.key ?? ''
  const href = `#${name}`

  const text = upperFirst(
    message.replace(
      /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
      (text) => format(parseISO(text), 'd MMMM yyyy')
    )
  )

  return {
    path,
    href,
    name,
    text,
    context
  }
}
