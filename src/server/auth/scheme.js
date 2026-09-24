import Boom from '@hapi/boom'

import { SignInRequiredError } from '~/src/server/auth/SignInRequiredError.js'
import { isUsable, refreshAccessToken } from '~/src/server/auth/accessToken.js'
import { getIdentity, getTokens } from '~/src/server/auth/accountSession.js'
import { signInUrl } from '~/src/server/utils/utils.js'

export const CITIZEN_SESSION = 'citizen-session'

/**
 * Turns a signed-in session into request credentials, refreshing the access
 * token first when it is close to expiring. A route that does not need the
 * citizen, such as a static asset, should set `auth: false` so it does not
 * refresh.
 */
export function citizenSessionScheme() {
  return {
    /**
     * @param {Request} request
     * @param {ResponseToolkit} h
     */
    async authenticate(request, h) {
      const identity = getIdentity(request.yar)
      const tokens = getTokens(request.yar)

      if (!identity || !tokens) {
        return anonymous(request, h)
      }

      /** @type {string | undefined} */
      let accessToken = tokens.accessToken

      if (!isUsable(tokens)) {
        try {
          // Undefined when the provider could not refresh the token for now.
          // The citizen stays signed in without an access token, and the
          // next request tries the refresh again.
          accessToken = await refreshAccessToken(request, identity.sub, tokens)
        } catch (err) {
          if (err instanceof SignInRequiredError) {
            return anonymous(request, h)
          }

          throw err
        }
      }

      return h.authenticated({
        credentials: {
          ...identity,
          ...(accessToken && { accessToken })
        }
      })
    }
  }
}

/**
 * A request with no signed-in citizen. A route that requires sign in gets a
 * redirect that returns the user to the current path afterwards.
 * @param {Request} request
 * @param {ResponseToolkit} h
 */
function anonymous(request, h) {
  if (request.auth.mode === 'required') {
    return h.redirect(signInUrl(request.path)).takeover()
  }

  return h.unauthenticated(Boom.unauthorized(null, CITIZEN_SESSION))
}

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */
