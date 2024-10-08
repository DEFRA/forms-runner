import { type Request, type ResponseToolkit } from '@hapi/hapi'
import { format, parseISO } from 'date-fns'
import { type ValidationErrorItem, type ValidationResult } from 'joi'
import upperFirst from 'lodash/upperFirst.js'

import { RelativeUrl } from '~/src/server/plugins/engine/feedback/index.js'
import { type FormSubmissionErrors } from '~/src/server/plugins/engine/types.js'

export const feedbackReturnInfoKey = 'f_t'

const paramsToCopy = [feedbackReturnInfoKey] as const

export function proceed(
  request: Pick<RequestWithQuery, 'query'>,
  h: Pick<ResponseToolkit, 'redirect'>,
  nextUrl: string
) {
  const { returnUrl } = request.query

  if (returnUrl?.startsWith('/')) {
    return h.redirect(returnUrl)
  } else {
    return redirectTo(request, h, nextUrl)
  }
}

interface Params extends Partial<Record<string, string>> {
  returnUrl?: string
  [feedbackReturnInfoKey]?: string
}

type RequestWithQuery = Request<{
  Query: Params
}>

export function redirectUrl(
  request: Pick<RequestWithQuery, 'query'>,
  targetUrl: string,
  params?: Params
) {
  const relativeUrl = new RelativeUrl(targetUrl)
  Object.entries(params ?? {}).forEach(([name, value]) => {
    relativeUrl.setParam(name, `${value}`)
  })

  paramsToCopy.forEach((key) => {
    const value = request.query[key]
    if (typeof value === 'string' && !relativeUrl.getParam(key)) {
      relativeUrl.setParam(key, value)
    }
  })

  return relativeUrl.toString()
}

export function redirectTo(
  request: Pick<RequestWithQuery, 'query'>,
  h: Pick<ResponseToolkit, 'redirect'>,
  targetUrl: string,
  params?: Params
) {
  if (targetUrl.startsWith('http')) {
    return h.redirect(targetUrl)
  }

  const url = redirectUrl(request, targetUrl, params)
  return h.redirect(url)
}

export const idFromFilename = (filename: string) => {
  return filename.replace(/govsite\.|\.json|/gi, '')
}

export const filesize = (bytes: number) => {
  let i = -1
  const byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB']
  do {
    bytes = bytes / 1000
    i++
  } while (bytes > 1000)

  return Math.max(bytes, 0.1).toFixed(1) + byteUnits[i]
}

/**
 * Parses the errors from joi.validate so they can be rendered by govuk-frontend templates
 * @param validationResult - provided by joi.validate
 */
export function getPageErrors(
  validationResult: Pick<ValidationResult, 'error'> | undefined,
  options: Omit<FormSubmissionErrors, 'errorList'>
): FormSubmissionErrors | undefined {
  if (!validationResult?.error) {
    return
  }

  return {
    titleText: options.titleText, // e.g. "There is a problem"
    errorList: validationResult.error.details.map(getPageError)
  }
}

export function getPageError(err: ValidationErrorItem) {
  const isoRegex =
    /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/

  const name = err.path
    .map((name, index) => (index > 0 ? `__${name}` : name))
    .join('')

  return {
    path: err.path.join('.'),
    href: `#${name}`,
    name,
    text: upperFirst(
      err.message.replace(isoRegex, (text) =>
        format(parseISO(text), 'd MMMM yyyy')
      )
    )
  }
}
