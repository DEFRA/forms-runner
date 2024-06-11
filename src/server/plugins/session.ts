import yar from '@hapi/yar'

import config from '~/src/server/config.js'

export default {
  plugin: yar,
  options: {
    maxCookieSize: 0, // Always use server-side storage
    cache: {
      cache: 'session',
      expiresIn: config.sessionTimeout
    },
    storeBlank: false,
    errorOnCacheNotReady: true,
    cookieOptions: {
      password: config.sessionCookiePassword,
      isSecure: config.isProd,
      isHttpOnly: true,
      isSameSite: 'Lax'
    }
  }
}
