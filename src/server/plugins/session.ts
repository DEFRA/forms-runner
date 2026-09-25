import {
  type Request,
  type ResponseToolkit,
  type ServerRegisterPluginObject
} from '@hapi/hapi'
import yar, { type YarOptions } from '@hapi/yar'

import { config } from '~/src/config/index.js'

/**
 * Yar is used for temporary session data but not form submissions, e.g. UI helpers, session flags.
 */
const yarOptions: YarOptions = {
  maxCookieSize: 0, // Always use server-side storage
  cache: {
    cache: 'session',
    segment: 'session',
    expiresIn: config.get('sessionTimeout')
  },
  /**
   * @todo storeBlank is current commented out as it's a minor efficiency gain but breaks the auth tests if enabled.
   * this only seems to affect the auth code, which we might remove anyway so it's temporarily disabled.
   */
  // storeBlank: false,
  cookieOptions: {
    password: config.get('sessionCookiePassword'),
    isSecure: config.get('isProduction')
  }
}

/**
 * Starts the session's time limit again on each request. The session then
 * ends only after SESSION_TIMEOUT with no request. A route with `auth: false`,
 * such as a static asset, does not start it again.
 */
function keepSession(request: Request, h: ResponseToolkit) {
  // hapi sets `auth` to false on such a route. Its types leave that value out.
  const auth: unknown = request.route.settings.auth

  if (auth !== false) {
    request.yar.touch()
  }

  return h.continue
}

export default {
  plugin: {
    name: 'session',
    async register(server) {
      await server.register({ plugin: yar, options: yarOptions })
      server.ext('onPostAuth', keepSession)
    }
  }
} satisfies ServerRegisterPluginObject<void>
