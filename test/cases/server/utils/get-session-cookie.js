export function getSessionCookie(res) {
  const COOKIE_NAME = 'session'
  const sessionId = res.headers['set-cookie']
    .map((cookie) => {
      const [name, value] = cookie.split(';')[0].split('=')
      return { name, value }
    })
    .find(({ name }) => name === COOKIE_NAME).value

  const cookie = `${COOKIE_NAME}=${sessionId}`

  return cookie
}
