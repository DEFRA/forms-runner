import Boom from '@hapi/boom'
import Joi from 'joi'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import { SignInOutcome } from '~/src/server/auth/SignInOutcome.js'
import {
  clearIdentity,
  clearSignInTransaction,
  getSignInTransaction,
  getTokens,
  setIdentity,
  setSignInTransaction,
  setTokens
} from '~/src/server/auth/accountSession.js'
import { signInEvent } from '~/src/server/auth/signInEvent.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import {
  CALLBACK_PATH,
  SIGNED_OUT_PATH,
  SIGN_IN_PATH,
  SIGN_OUT_PATH
} from '~/src/server/constants.js'
import { returnUrlSchema } from '~/src/server/models/common.js'

const SCOPES = 'openid email'

const BASE_URL = config.get('baseUrl')

/**
 * The API a token is wanted for. It must be named on the authorization
 * request as well as the token request: asking only at the token endpoint
 * returns an opaque token and no error.
 */
const RESOURCE = config.get('oidc.submissionApiResource')

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
        resource: RESOURCE,
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
   * @satisfies {ServerRoute<{ Query: { slug?: string, previewMode?: string } }>}
   */
  ({
    method: 'GET',
    path: SIGN_OUT_PATH,
    async handler(request, h) {
      const oidcConfig = await request.server.app.oidc.getConfig()

      // A session with no tokens is signed out without an ID token hint
      const idToken = getTokens(request.yar)?.idToken

      clearIdentity(request.yar)

      const { slug, previewMode } = request.query
      const stateParam = JSON.stringify({ slug, previewMode })

      const postLogoutUrl = new URL(SIGNED_OUT_PATH, BASE_URL)

      const logoutUrl = client.buildEndSessionUrl(oidcConfig, {
        ...(idToken && { id_token_hint: idToken }),
        client_id: 'runner',
        // Registered in OIDC_RUNNER_POST_LOGOUT_REDIRECT_URIS — without it
        // the provider shows its own success page instead of returning here
        post_logout_redirect_uri: postLogoutUrl.href,
        state: stateParam
      })
      return h.redirect(logoutUrl.href)
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
            SignInOutcome.Failure,
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
          },
          { resource: RESOURCE }
        )

        const claims = tokens.claims()

        if (!claims) {
          throw new Error('Token response carried no ID token claims')
        }

        // A token bound to a resource cannot reach the userinfo endpoint, so
        // the provider puts the scope's claims in the ID token instead.
        const email = /** @type {string | undefined} */ (claims.email)

        if (!email || !tokens.id_token) {
          throw new Error('Provider did not return an email or ID token')
        }

        // The expiry is worked out from `expires_in` rather than from the
        // access token's `exp` claim. The token is issued for
        // forms-submission-api, so this service neither reads nor validates
        // it.
        if (
          !tokens.access_token ||
          !tokens.refresh_token ||
          tokens.expires_in === undefined
        ) {
          throw new Error(
            'Provider did not return an access token, refresh token or expiry'
          )
        }

        setIdentity(request.yar, {
          iss: claims.iss,
          sub: claims.sub,
          email
        })

        setTokens(request.yar, {
          accessToken: tokens.access_token,
          accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
          refreshToken: tokens.refresh_token,
          idToken: tokens.id_token
        })
      } catch (err) {
        logger.error(
          {
            err,
            ...signInEvent(
              'sign-in-callback',
              SignInOutcome.Failure,
              'codeExchangeFailed'
            )
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
  }),
  /**
   * @satisfies {ServerRoute<{ Query: { state: string } }>}
   */
  ({
    method: 'GET',
    path: SIGNED_OUT_PATH,
    handler(request, h) {
      const { state } = request.query
      const { slug, previewMode } = JSON.parse(state)
      const signInLink = previewMode
        ? `/homepage/preview/${previewMode}/${slug}`
        : `/homepage/${slug}`
      return h.view('auth/signed-out', { signInLink })
    }
  })
]

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
