import Boom from '@hapi/boom'
import Joi from 'joi'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import {
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
        const tokens = await client.authorizationCodeGrant(
          oidcConfig,
          new URL(request.url.href),
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
  })
]

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
