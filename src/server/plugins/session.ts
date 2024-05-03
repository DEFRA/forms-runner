import yar from '@hapi/yar'

import config from '~/src/server/config.js'
import generateCookiePassword from '~/src/server/utils/generateCookiePassword.js'

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
