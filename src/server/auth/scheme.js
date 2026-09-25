import Boom from '@hapi/boom'

import { SignInRequiredError } from '~/src/server/auth/SignInRequiredError.js'
import {
  hasExpired,
  isUsable,
  refreshAccessToken
} from '~/src/server/auth/accessToken.js'
import {
  clearIdentity,
  getIdentity,
  getTokens,
  setTokens
} from '~/src/server/auth/accountSession.js'
import { signInUrl } from '~/src/server/utils/utils.js'

export const CITIZEN_SESSION = 'citizen-session'

/**
 * Turns a signed-in session into request credentials, refreshing the access
 * token first when it is close to expiring. This is the only place that saves
 * refreshed tokens, or signs the citizen out when a refresh is refused. A
 * route that does not need the citizen, such as a static asset, should set
 * `auth: false` so it does not refresh.
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

      /** @type {TokenSet} */
      let current = tokens

      if (!isUsable(tokens)) {
        try {
          const refreshed = await refreshAccessToken(
            request,
            identity.sub,
            tokens
          )

          if (refreshed) {
            setTokens(request.yar, refreshed)
            current = refreshed
          }
        } catch (err) {
          if (err instanceof SignInRequiredError) {
            clearIdentity(request.yar)

            return anonymous(request, h)
          }

          throw err
        }
      }

      const { accessToken, accessTokenExpiresAt, ...otherTokens } = current

      return h.authenticated({
        credentials: {
          ...identity,
          ...otherTokens,
          ...(!hasExpired(current) && { accessToken, accessTokenExpiresAt })
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
 * @import { TokenSet } from '~/src/server/auth/accountSession.js'
 */
