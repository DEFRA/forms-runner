import Boom from '@hapi/boom'
import Joi from 'joi'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import {
  clearSignInTransaction,
  getSignInTransaction,
  setIdentity,
  setSignInTransaction
} from '~/src/server/auth/accountSession.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { CALLBACK_PATH, SIGN_IN_PATH } from '~/src/server/constants.js'
import { returnUrlSchema } from '~/src/server/models/common.js'

const SCOPES = 'openid email'

/**
 * Log attributes for a sign-in step. CDP indexes the `event` object, so these
 * are searchable. Values are fixed strings; nothing from the provider or the
 * session is logged.
 * @param {string} action
 * @param {string} outcome - `success`, `failure` or `unknown`
 * @param {string} reason
 */
function signInEvent(action, outcome, reason) {
  return {
    event: {
      category: 'authentication',
      action,
      outcome,
      reason
    }
  }
}

export default [
  /**
   * @satisfies {ServerRoute<{ Query: { returnUrl: string } }>}
   */
  ({
    method: 'GET',
    path: SIGN_IN_PATH,
    async handler(request, h) {
      const { returnUrl } = request.query

      const oidcConfig = await request.server.app.oidc.getConfig()

      const codeVerifier = client.randomPKCECodeVerifier()
      const state = client.randomState()
      const nonce = client.randomNonce()

      setSignInTransaction(request.yar, {
        state,
        nonce,
        codeVerifier,
        returnUrl
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
        // Only `returnUrl` is read. Other keys, such as tracking parameters,
        // are ignored so they do not block sign in.
        query: Joi.object({
          returnUrl: returnUrlSchema.required()
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
      const transaction = getSignInTransaction(request.yar)

      // `state` is the random value sign in generated and the provider sends
      // back. It matches the one in this session when the callback belongs to
      // this session's sign in. The transaction is read but not cleared, so a
      // callback that does not match leaves it for the one that does.
      if (!transaction || transaction.state !== request.query.state) {
        logger.warn(
          signInEvent(
            'sign-in-callback',
            'failure',
            transaction ? 'stateMismatch' : 'noTransactionInSession'
          ),
          '[signInRejected] Callback did not match a sign-in this session started'
        )

        throw Boom.forbidden('Sign in could not be completed')
      }

      const oidcConfig = await request.server.app.oidc.getConfig()

      try {
        // The token request must send the same redirect URI as the sign-in
        // request. Build it from configuration, because a proxy sets the host
        // and the scheme on the request. Take only the query string, which
        // holds the code and the state, from the request.
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

        // The ID token proves who signed in, but it carries no email. Ask the
        // userinfo endpoint for the email. The access token expires in five
        // minutes, so ask now.
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
        logger.error(
          {
            err,
            ...signInEvent('sign-in-callback', 'failure', 'codeExchangeFailed')
          },
          '[signInFailed] Could not complete sign in'
        )
        throw Boom.forbidden('Sign in could not be completed')
      } finally {
        // One attempt per transaction, whether it succeeded or not. To try
        // again the user starts a new sign in and gets a new state, nonce and
        // code verifier.
        clearSignInTransaction(request.yar)
      }

      return h.redirect(transaction.returnUrl)
    },
    options: {
      validate: {
        // The provider decides what else it sends back with the code and the
        // state, so this route accepts keys it does not name.
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
