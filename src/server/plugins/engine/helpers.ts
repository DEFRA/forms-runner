import { type Request, type ResponseToolkit } from '@hapi/hapi'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import { RelativeUrl } from '~/src/server/plugins/engine/feedback/index.js'
import {
  FormState,
  type FormStatus
} from '~/src/server/plugins/engine/models/types.js'

const logger = createLogger()

export const ADD_ANOTHER = 'add-another'
export const CONTINUE = 'continue'

export function proceed(
  request: Pick<RequestWithQuery, 'query'>,
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

export function redirectUrl(targetUrl: string, params?: Params) {
  const relativeUrl = new RelativeUrl(targetUrl)

  Object.entries(params ?? {}).forEach(([name, value]) => {
    relativeUrl.setParam(name, `${value}`)
  })

  return relativeUrl.toString()
}

export function redirectTo(
  h: Pick<ResponseToolkit, 'redirect'>,
  targetUrl: string,
  params?: Params
) {
  if (targetUrl.startsWith('http')) {
    return h.redirect(targetUrl)
  }

  const url = redirectUrl(targetUrl, params)
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

export function checkFormStatus(path: string): FormStatus {
  const isPreview = path.toLowerCase().startsWith(PREVIEW_PATH_PREFIX)

  let state: FormState

  if (isPreview) {
    const previewState = path.split('/')[2]

    if (!Object.values(FormState).includes(previewState as FormState)) {
      throw new Error(`Invalid form state: ${previewState}`)
    }

    state = previewState as FormState
  } else {
    state = FormState.LIVE
  }

  return {
    isPreview,
    state
  }
}

export interface Params extends Partial<Record<string, string>> {
  returnUrl?: string
}

export type RequestWithQuery = Request<{
  Query: Params
}>
