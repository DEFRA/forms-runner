import cookie from 'cookie'

/**
 * @param {ServerInjectResponse<string | object>} response
 * @param {string} name
 */
export function getCookie(response, name) {
  const headers = [response.headers['set-cookie']].flat()
  const header = headers.find((header) => header?.includes(`${name}=`)) ?? ''

  const value = cookie.parse(header)[name]

  if (!value) {
    throw new Error(`Cookie ${name} not found`)
  }

  return value
}

/**
 * @param {ServerInjectResponse<string | object>} response
 * @param {string} name
 */
export function getCookieHeader(response, name) {
  const value = getCookie(response, name)

  return {
    cookie: `${name}=${value}`
  }
}

/**
 * @import { ServerInjectResponse } from '@hapi/hapi'
 */
