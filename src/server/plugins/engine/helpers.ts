import { type Request, type ResponseToolkit } from '@hapi/hapi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import { RelativeUrl } from '~/src/server/plugins/engine/feedback/index.js'

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

export function hasPreviewPath(path: string) {
  return path.toLowerCase().startsWith(PREVIEW_PATH_PREFIX)
}
