import {
  type Request,
  type ResponseToolkit,
  type ServerRegisterPluginObject
} from '@hapi/hapi'

import { SignInRequiredError } from '~/src/server/auth/SignInRequiredError.js'
import {
  CITIZEN_SESSION,
  citizenSessionScheme
} from '~/src/server/auth/scheme.js'
import { signInUrl } from '~/src/server/utils/utils.js'

export default {
  plugin: {
    name: 'auth',
    register(server) {
      server.auth.scheme(CITIZEN_SESSION, citizenSessionScheme)
      server.auth.strategy(CITIZEN_SESSION, CITIZEN_SESSION)

      // Applies to every route, including the ones the engine plugin
      // registers, because hapi rebuilds routes already in the table. `try`
      // means an anonymous request carries on with no credentials, so no
      // existing route changes behaviour.
      server.auth.default({ strategy: CITIZEN_SESSION, mode: 'try' })

      // A route that needed an access token and could not get one sends the
      // citizen to sign in, returning to the same path. When the provider
      // session is still valid, they are signed back in with no prompt.
      server.ext('onPreResponse', (request: Request, h: ResponseToolkit) => {
        if (!(request.response instanceof SignInRequiredError)) {
          return h.continue
        }

        // Any other method is sent to sign in too, but what it submitted is
        // lost: sign in returns the citizen with a GET to the same path.
        return h.redirect(signInUrl(request.path))
      })
    }
  }
} satisfies ServerRegisterPluginObject<void>
