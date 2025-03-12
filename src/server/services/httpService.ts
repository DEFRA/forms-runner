import Wreck from '@hapi/wreck'

import { applyTraceHeaders } from '~/src/server/utils/utils.js'

export type Method = keyof Pick<typeof Wreck, 'get' | 'post' | 'put' | 'delete'>
export type RequestOptions = Parameters<typeof Wreck.defaults>[0]

export const request = async <BodyType = Buffer>(
  method: Method,
  url: string,
  options?: RequestOptions
) => {
  const headers = applyTraceHeaders(options?.headers)

  const mergedOptions = { ...options, headers }

  const { res, payload } = await Wreck[method]<BodyType>(url, mergedOptions)

  if (!res.statusCode || res.statusCode < 200 || res.statusCode > 299) {
    return { res, error: payload || new Error('Unknown error') }
  }

  return { res, payload }
}

export const get = <BodyType>(url: string, options?: RequestOptions) => {
  return request<BodyType>('get', url, options)
}

export const getJson = <BodyType extends object>(url: string) => {
  return get<BodyType>(url, { json: true })
}

export const post = <BodyType>(url: string, options: RequestOptions) => {
  return request<BodyType>('post', url, options)
}

export const postJson = <BodyType extends object>(
  url: string,
  options: RequestOptions
) => {
  return post<BodyType>(url, {
    ...options,
    json: true
  })
}

export const put = <BodyType>(url: string, options: RequestOptions) => {
  return request<BodyType>('put', url, options)
}
