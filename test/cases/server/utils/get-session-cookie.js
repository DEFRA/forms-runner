/**
 * @param {ServerInjectResponse} response
 */
export function getSessionCookie(response) {
  const cookies = [response.headers['set-cookie']].flat()
  const cookie = cookies.find((header) => header?.includes('session=')) ?? ''

  const [name, sessionId] = cookie.split(';')[0].split('=')
  return `${name}=${sessionId}`
}

/**
 * @typedef {import('@hapi/hapi').ServerInjectResponse} ServerInjectResponse
 */
