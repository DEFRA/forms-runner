import Boom from '@hapi/boom'
import Joi from 'joi'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import {
  clearSignInTransaction,
  getSignInTransaction,
  localReturnPath,
  setIdentity,
  setSignInTransaction
} from '~/src/server/auth/accountSession.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { CALLBACK_PATH, SIGN_IN_PATH } from '~/src/server/constants.js'

const SCOPES = 'openid email'

/**
 * The names of the cookies a request arrived with, for the logs. Names alone
 * are safe to log and are enough to tell a session that came back from the
 * provider apart from one that did not.
 * @param {Record<string, unknown>} state `request.state`
 */
function cookieNames(state) {
  return Object.keys(state).sort()
}

export default [
  /**
   * @satisfies {ServerRoute<{ Query: { returnTo: string } }>}
   */
  ({
    method: 'GET',
    path: SIGN_IN_PATH,
    async handler(request, h) {
      const { returnTo } = request.query

      const oidcConfig = await request.server.app.oidc.getConfig()

      const codeVerifier = client.randomPKCECodeVerifier()
      const state = client.randomState()
      const nonce = client.randomNonce()

      setSignInTransaction(request.yar, {
        state,
        nonce,
        codeVerifier,
        returnTo
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
          // Resolved here rather than in the handler, so the value the
          // handler stores is already the path it will redirect to. A target
          // this service cannot reach answers 400 before the round trip
          // starts, which is a sign in the citizen keeps.
          returnTo: Joi.string()
            .required()
            .custom(
              (value, helpers) =>
                localReturnPath(value) ?? helpers.error('any.invalid')
            )
            .messages({
              'any.invalid': '"returnTo" must be a path within this service'
            })
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

      // `state` is the random value sign in generated and the provider echoes
      // back untouched. Matching it against the one this session stored is
      // what identifies the callback as the completion of this session's own
      // sign in. Reading the transaction without consuming it leaves it for
      // the genuine callback when some other one arrives first.
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
        // Built from configuration so the redirect_uri sent to the token
        // endpoint equals the one sign in gave the provider, byte for byte,
        // whatever host or scheme a proxy in front of this service presents.
        // The query string (code, state) comes from the request itself.
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
        // One attempt per transaction, whatever the outcome. A citizen whose
        // sign in failed starts a fresh one from the beginning, which gives
        // them a new state, nonce and code verifier.
        clearSignInTransaction(request.yar)
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
