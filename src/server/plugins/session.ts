import yar from '@hapi/yar'

import config from '~/src/server/config.js'

export default {
  plugin: yar,
  options: {
    cache: {
      expiresIn: config.sessionTimeout
    },
    cookieOptions: {
      password: config.sessionCookiePassword,
      isSecure: !!config.isDev,
      isHttpOnly: true,
      isSameSite: 'Lax'
    }
  }
}
