import { Boom } from '@hapi/boom'
import { type Request, type ResponseToolkit } from '@hapi/hapi'
import { reach } from '@hapi/hoek'
import set from 'lodash/set.js'

import { getFormMetadata } from './services/formsService.js'

import { RelativeUrl } from '~/src/server/plugins/engine/feedback/index.js'

export const feedbackReturnInfoKey = 'f_t'

const paramsToCopy = [feedbackReturnInfoKey]

export function proceed(request: Request, h: ResponseToolkit, nextUrl: string) {
  const returnUrl = request.query.returnUrl

  if (typeof returnUrl === 'string' && returnUrl.startsWith('/')) {
    return h.redirect(returnUrl)
  } else {
    return redirectTo(request, h, nextUrl)
  }
}

interface Params {
  num?: number
  returnUrl: string
}

export function nonRelativeRedirectUrl(
  request: Request,
  targetUrl: string,
  params?: Params
) {
  const url = new URL(targetUrl)

  Object.entries(params ?? {}).forEach(([name, value]) => {
    url.searchParams.append(name, `${value}`)
  })

  paramsToCopy.forEach((key) => {
    const value = request.query[key]
    if (typeof value === 'string') {
      url.searchParams.append(key, value)
    }
  })

  return url.toString()
}

export function redirectUrl(
  request: Request,
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
  request: Request,
  h: ResponseToolkit,
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

export function getValidStateFromQueryParameters(
  prePopFields: Record<string, string>,
  queryParameters: Record<string, string>,
  state: Record<string, unknown> = {}
) {
  return Object.entries(queryParameters).reduce((acc, [key, value]) => {
    if (reach(prePopFields, key) === undefined || reach(state, key)) {
      return acc
    }

    const result = reach(prePopFields, key).validate(value)
    if (result.error) {
      return acc
    }
    set(acc, key, value)
    return acc
  }, {})
}

export async function extractFormInfoFromPath(
  request: Request,
  PREVIEW_PATH_PREFIX: string
) {
  const { params, path } = request
  const { slug } = params
  const isPreview = path.toLowerCase().includes(PREVIEW_PATH_PREFIX)
  const formState = isPreview ? params.state : 'live'

  const metadata = await getFormMetadata(slug)
  const { id, [formState]: state } = metadata

  // Check the metadata supports the requested state
  if (!state) {
    throw Boom.notFound(`No '${formState}' state for form metadata ${id}`)
  }

  // Cache the models based on id, state and whether
  // it's a preview or not. There could be up to 3 models
  // cached for a single form:
  // "{id}_live_false" (live/live)
  // "{id}_live_true" (live/preview)
  // "{id}_draft_true" (draft/preview)
  return {
    cacheKey: `${id}_${formState}_${isPreview}`,
    id,
    slug,
    formState,
    state,
    isPreview
  }
}
