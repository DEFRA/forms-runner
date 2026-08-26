import Boom from '@hapi/boom'

import { getIdentity } from '~/src/server/auth/accountSession.js'
import { signInUrl } from '~/src/server/utils/utils.js'

export const CITIZEN_SESSION = 'citizen-session'

/**
 * Turns a signed-in session into request credentials. It only reads, so it
 * is safe as the server-wide default: one session read per request.
 */
export function citizenSessionScheme() {
  return {
    /**
     * @param {Request} request
     * @param {ResponseToolkit} h
     */
    authenticate(request, h) {
      const identity = getIdentity(request.yar)

      if (!identity) {
        // A route that requires sign in gets a redirect that returns the
        // user to the current path afterwards.
        if (request.auth.mode === 'required') {
          return h.redirect(signInUrl(request.path)).takeover()
        }

        // A null message means credentials are absent rather than wrong, so
        // `try` mode continues without them.
        return h.unauthenticated(Boom.unauthorized(null, CITIZEN_SESSION))
      }

      return h.authenticated({ credentials: identity })
    }
  }
}

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */
