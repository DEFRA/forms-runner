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
 * The names of the cookies a request arrived with, for the logs. Names are
 * safe to log and show whether the session cookie came back.
 * @param {Record<string, unknown>} state `request.state`
 */
function cookieNames(state) {
  return Object.keys(state).sort()
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
        // Built from config so the redirect_uri matches the one sign in sent,
        // byte for byte. The request host and scheme come from the proxy, so
        // they cannot be used. Only the query string (code, state) is taken
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
