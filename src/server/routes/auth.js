import Boom from '@hapi/boom'
import Joi from 'joi'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import {
  clearTransaction,
  getTransaction,
  localReturnPath,
  setIdentity,
  setTransaction
} from '~/src/server/auth/session.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { CALLBACK_PATH, SIGN_IN_PATH } from '~/src/server/constants.js'

const SCOPES = 'openid email'

/**
 * Cookie names only, never their values. A sign-in that fails because the
 * session did not come back with the citizen is indistinguishable, from the
 * logs alone, from one that failed for any other reason — the names say which
 * of the two happened without putting a session id or a token in the log.
 * @param {Record<string, unknown>} state `request.state`
 */
function cookieNames(state) {
  return Object.keys(state).sort()
}

export default [
  /**
   * @satisfies {ServerRoute<{ Query: { returnTo?: string } }>}
   */
  ({
    method: 'GET',
    path: SIGN_IN_PATH,
    async handler(request, h) {
      const oidcConfig = await request.server.app.oidc.getConfig()

      const codeVerifier = client.randomPKCECodeVerifier()
      const state = client.randomState()
      const nonce = client.randomNonce()

      const { returnTo } = request.query

      setTransaction(request.yar, {
        state,
        nonce,
        codeVerifier,
        returnTo: localReturnPath(returnTo) ?? '/'
      })

      logger.info(
        {
          sessionId: request.yar.id,
          state,
          cookiesReceived: cookieNames(request.state)
        },
        '[signInStarted] Stored the sign-in transaction'
      )

      const authorizationUrl = client.buildAuthorizationUrl(oidcConfig, {
        redirect_uri: config.get('oidc.redirectUri'),
        scope: SCOPES,
        state,
        nonce,
        code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
        code_challenge_method: 'S256'
      })

      return h.redirect(authorizationUrl.href)
    },
    options: {
      validate: {
        query: Joi.object({
          returnTo: Joi.string().optional()
        }).unknown(true)
      }
    }
  }),
  /**
   * @satisfies {ServerRoute<{ Query: { code?: string, state?: string } }>}
   */
  ({
    method: 'GET',
    path: CALLBACK_PATH,
    async handler(request, h) {
      // Read without consuming: a callback whose state does not match is
      // not the sign-in this transaction belongs to — a second tab, a
      // forged link, a replay — and must not destroy it, or the genuine
      // callback that arrives afterwards finds nothing to complete.
      const transaction = getTransaction(request.yar)

      if (!transaction || transaction.state !== request.query.state) {
        logger.warn(
          {
            sessionId: request.yar.id,
            reason: transaction ? 'stateMismatch' : 'noTransactionInSession',
            stateFromProvider: request.query.state,
            stateInSession: transaction?.state ?? null,
            cookiesReceived: cookieNames(request.state)
          },
          '[signInRejected] Callback did not match a sign-in this session started'
        )

        throw Boom.forbidden('Sign in could not be completed')
      }

      const oidcConfig = await request.server.app.oidc.getConfig()

      try {
        // Built from configuration, not from the inbound request, so a proxy
        // that rewrites the host or scheme can't change the redirect_uri this
        // sends to the token endpoint — it must equal the one /login gave the
        // provider, byte for byte. Only the query string (code, state) comes
        // from the request.
        const callbackUrl = new URL(config.get('oidc.redirectUri'))
        callbackUrl.search = request.url.search

        const tokens = await client.authorizationCodeGrant(
          oidcConfig,
          callbackUrl,
          {
            pkceCodeVerifier: transaction.codeVerifier,
            expectedState: transaction.state,
            expectedNonce: transaction.nonce
          }
        )

        const claims = tokens.claims()

        if (!claims) {
          throw new Error('Token response carried no ID token claims')
        }

        // The provider leaves `conformIdTokenClaims` at its default, so the ID
        // token carries no email. The access token lives five minutes, so this
        // is the only chance to ask.
        const userinfo = await client.fetchUserInfo(
          oidcConfig,
          tokens.access_token,
          claims.sub
        )

        if (!userinfo.email || !tokens.id_token) {
          throw new Error('Provider did not return an email or ID token')
        }

        setIdentity(request.yar, {
          iss: claims.iss,
          sub: claims.sub,
          email: userinfo.email,
          idToken: tokens.id_token
        })

        // Consume the transaction only once sign in has actually completed,
        // so a failed exchange leaves it in place for a retry with the same
        // state rather than needing a fresh /login.
        clearTransaction(request.yar)
      } catch (err) {
        logger.error(err, '[signInFailed] Could not complete sign in')
        throw Boom.forbidden('Sign in could not be completed')
      }

      return h.redirect(transaction.returnTo)
    },
    options: {
      validate: {
        query: Joi.object({
          code: Joi.string().optional(),
          state: Joi.string().optional()
        }).unknown(true)
      }
    }
  })
]

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
