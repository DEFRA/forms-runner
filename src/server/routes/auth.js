import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import Joi from 'joi'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import {
  SIGNED_OUT_FROM_KEY,
  clearTransaction,
  getTransaction,
  localReturnPath,
  setIdentity,
  setTransaction
} from '~/src/server/auth/session.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

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
    path: '/login',
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
    path: '/callback',
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
  }),
  /**
   * @satisfies {ServerRoute<{ Query: { slug?: string } }>}
   */
  ({
    method: 'GET',
    path: '/logout',
    async handler(request, h) {
      const { slug } = request.query

      if (!request.auth.isAuthenticated) {
        // Nothing to end at the provider and no session to reset — the
        // forms engine keys in-progress answers on the session id, and
        // resetting it here would orphan them for a citizen who followed a
        // stale link or bookmark without ever signing in.
        return h.redirect(slug ? `/homepage/${slug}` : '/')
      }

      // Read before resetting: request.auth.credentials carries the ID token
      // the citizen-session strategy took from this session at the start of
      // the request, which the reset below is about to throw away.
      const credentials = /** @type {AuthCredentials} */ (
        request.auth.credentials
      )

      const oidcConfig = await request.server.app.oidc.getConfig()

      const endSessionUrl = client.buildEndSessionUrl(oidcConfig, {
        ...(credentials.idToken && { id_token_hint: credentials.idToken }),
        client_id: config.get('oidc.clientId'),
        post_logout_redirect_uri: config.get('oidc.logoutRedirectUri')
      })

      request.yar.reset()

      if (slug) {
        // Survives the reset so /signed-out can offer a way back in.
        request.yar.set(SIGNED_OUT_FROM_KEY, slug)
      }

      return h.redirect(endSessionUrl.href)
    },
    options: {
      validate: {
        query: Joi.object({
          slug: slugSchema.optional()
        }).unknown(true)
      }
    }
  }),
  /**
   * @satisfies {ServerRoute}
   */
  ({
    method: 'GET',
    path: '/signed-out',
    handler(request, h) {
      const signedOutFrom = request.yar.get(SIGNED_OUT_FROM_KEY)
      request.yar.clear(SIGNED_OUT_FROM_KEY)

      return h.view('signed-out', { signedOutFrom })
    }
  })
]

/**
 * @import { AuthCredentials, ServerRoute } from '@hapi/hapi'
 */
