import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import Joi from 'joi'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import {
  SIGNED_OUT_FROM_KEY,
  isLocalPath,
  setIdentity,
  setTransaction,
  takeTransaction
} from '~/src/server/auth/session.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

const SCOPES = 'openid email'

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
        returnTo: isLocalPath(returnTo) ? /** @type {string} */ (returnTo) : '/'
      })

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
      const transaction = takeTransaction(request.yar)

      if (!transaction || transaction.state !== request.query.state) {
        // Either nothing was in flight, or this is not the sign-in we started.
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
      // Read before resetting: request.auth.credentials carries the ID token
      // the citizen-session strategy took from this session at the start of
      // the request, which the reset below is about to throw away. Hapi sets
      // it to null for a citizen who was never signed in, despite its own
      // types calling it required.
      const credentials = /** @type {AuthCredentials | null} */ (
        request.auth.credentials
      )
      const { slug } = request.query

      const oidcConfig = await request.server.app.oidc.getConfig()

      const endSessionUrl = client.buildEndSessionUrl(oidcConfig, {
        ...(credentials?.idToken && { id_token_hint: credentials.idToken }),
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
