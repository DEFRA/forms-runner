import Boom from '@hapi/boom'
import { type ResponseToolkit } from '@hapi/hapi'
import { format, parseISO } from 'date-fns'
import { type Schema, type ValidationErrorItem } from 'joi'
import upperFirst from 'lodash/upperFirst.js'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import { RelativeUrl } from '~/src/server/plugins/engine/feedback/index.js'
import { type FormSubmissionError } from '~/src/server/plugins/engine/types.js'
import { FormStatus } from '~/src/server/routes/types.js'
import {
  type FormQuery,
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

const logger = createLogger()

export const ADD_ANOTHER = 'add-another'
export const CONTINUE = 'continue'

export function proceed(
  request: Pick<FormRequest | FormRequestPayload, 'query'>,
  h: Pick<ResponseToolkit, 'redirect'>,
  nextUrl: string
) {
  const { returnUrl } = request.query

  if (returnUrl?.startsWith('/')) {
    return h.redirect(returnUrl)
  } else {
    return redirectTo(h, nextUrl)
  }
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

export function redirectTo(
  h: Pick<ResponseToolkit, 'redirect'>,
  targetUrl: string,
  params?: FormQuery
) {
  if (targetUrl.startsWith('http')) {
    return h.redirect(targetUrl)
  }

  const url = redirectUrl(targetUrl, params)
  return h.redirect(url)
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
