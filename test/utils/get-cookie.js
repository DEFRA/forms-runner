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
 * @param {string | string[]} names
 * @returns {Pick<OutgoingHttpHeaders, 'cookie'>}
 */
export function getCookieHeader(response, names) {
  const cookies = /** @satisfies {string[]} */ ([])

  for (const name of [names].flat()) {
    cookies.push([name, getCookie(response, name)].join('='))
  }

  return {
    cookie: cookies.join('; ')
  }
}

/**
 * @import { ServerInjectResponse } from '@hapi/hapi'
 * @import { OutgoingHttpHeaders } from 'node:http'
 */
