import Boom from '@hapi/boom'

import { getIdentity } from '~/src/server/auth/accountSession.js'

export const CITIZEN_SESSION = 'citizen-session'

/**
 * Turns a signed-in session into request credentials. It reads; it never
 * writes, redirects or calls the provider, so it is safe as the server-wide
 * default and costs one session read on any route.
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
        // A null message marks the credentials as absent rather than wrong,
        // which is what lets `try` mode continue with no credentials.
        return h.unauthenticated(Boom.unauthorized(null, CITIZEN_SESSION))
      }

      return h.authenticated({ credentials: identity })
    }
  }
}

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */
