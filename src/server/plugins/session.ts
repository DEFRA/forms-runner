import {
  type AuthSettings,
  type Request,
  type ResponseToolkit,
  type ServerRegisterPluginObject
} from '@hapi/hapi'
import yar, { type YarOptions } from '@hapi/yar'

import { config } from '~/src/config/index.js'

/**
 * Yar is used for temporary session data but not form submissions, e.g. UI helpers, session flags.
 * The plugin reads the config when it registers rather than when its module loads, so that a
 * test can change the config before it creates the server.
 */
function yarOptions(): YarOptions {
  return {
    maxCookieSize: 0, // Always use server-side storage
    cache: {
      cache: 'session',
      segment: 'session',
      expiresIn: config.get('sessionTimeout')
    },
    cookieOptions: {
      password: config.get('sessionCookiePassword'),
      isSecure: config.get('isProduction')
    }
  }
}

/**
 * Starts the session's time limit again on each request, except on routes
 * with `auth: false` such as static assets.
 */
function keepSession(request: Request, h: ResponseToolkit) {
  // hapi sets `auth` to false at runtime, which its RouteSettings type omits
  const auth = request.route.settings.auth as AuthSettings | false | undefined

  if (auth !== false) {
    request.yar.touch()
  }

  return h.continue
}

export default {
  plugin: {
    name: 'session',
    async register(server) {
      await server.register({ plugin: yar, options: yarOptions() })
      server.ext('onPostAuth', keepSession)
    }
  }
} satisfies ServerRegisterPluginObject<void>
