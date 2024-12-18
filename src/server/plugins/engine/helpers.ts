import { ControllerPath } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'
import { format, parseISO } from 'date-fns'
import { StatusCodes } from 'http-status-codes'
import { type Schema, type ValidationErrorItem } from 'joi'
import upperFirst from 'lodash/upperFirst.js'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import { RelativeUrl } from '~/src/server/plugins/engine/feedback/index.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
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

  const isReturnAllowed =
    payload && 'action' in payload
      ? payload.action === FormAction.Continue
      : false

  // Redirect to return location (optional)
  const response =
    isReturnAllowed && query.returnUrl?.startsWith('/')
      ? h.redirect(query.returnUrl)
      : h.redirect(nextUrl)

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

export function redirectUrl(targetUrl: string, params?: FormQuery) {
  const relativeUrl = new RelativeUrl(targetUrl)

  Object.entries(params ?? {}).forEach(([name, value]) => {
    relativeUrl.setParam(name, `${value}`)
  })

  return relativeUrl.toString()
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
  const startPath = normalisePath(model?.def.startPage)
  return startPath ? `/${startPath}` : ControllerPath.Start
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
