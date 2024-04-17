import yar from '@hapi/yar'
import config from '../config.js'
import generateCookiePassword from '../utils/generateCookiePassword.js'

export default {
  plugin: yar,
  options: {
    cache: {
      expiresIn: config.sessionTimeout
    },
    cookieOptions: {
      password: config.sessionCookiePassword || generateCookiePassword(),
      isSecure: !!config.isDev,
      isHttpOnly: true,
      isSameSite: 'Lax'
    }
  }
}
