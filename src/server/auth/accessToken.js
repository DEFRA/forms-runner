import Boom from '@hapi/boom'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import { SignInOutcome } from '~/src/server/auth/SignInOutcome.js'
import { SignInRequiredError } from '~/src/server/auth/SignInRequiredError.js'
import {
  clearIdentity,
  getTokens,
  setTokens
} from '~/src/server/auth/accountSession.js'
import { signInEvent } from '~/src/server/auth/signInEvent.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

const ACTION_KEYS = {
  tokenRefresh: 'token-refresh'
}

const COULD_NOT_REFRESH_THE_ACCESS_TOKEN_MESSAGE =
  'Could not refresh the access token'

/**
 * Returns an access token for forms-submission-api that has more than the
 * grace period left, refreshing it first if necessary. Call it just before
 * each API call rather than on every request.
 * @template {ReqRef} Refs
 * @param {Request<Refs>} request - an authenticated request
 * @returns {Promise<string>}
 * @throws {SignInRequiredError} when the citizen must sign in again
 * @throws {Boom.Boom} 503 when the tokens could not be refreshed for now
 */
export async function getAccessToken(request) {
  // A session from before the tokens were kept in the session has none
  const tokenSet = request.auth.isAuthenticated ? getTokens(request.yar) : null

  if (!tokenSet) {
    clearIdentity(request.yar)
    throw new SignInRequiredError('noTokenSet')
  }

  if (isUsable(tokenSet)) {
    return tokenSet.accessToken
  }

  return refresh(request, request.auth.credentials.sub, tokenSet)
}

/**
 * Whether the access token has more than the grace period left. A token
 * inside the grace period could expire before the API checks it.
 * @param {TokenSet} tokenSet
 * @returns {boolean}
 */
function isUsable(tokenSet) {
  const graceMs = config.get('oidc.accessTokenExpiryGraceSeconds') * 1000

  return tokenSet.accessTokenExpiresAt - Date.now() > graceMs
}

/**
 * Removes the tokens and the identity, so the citizen is treated as signed
 * out, and returns the error that sends them to sign in.
 * @param {RequestContext} request
 * @param {string} reason
 * @returns {SignInRequiredError}
 */
function signOutLocally(request, reason) {
  clearIdentity(request.yar)

  return new SignInRequiredError(reason)
}

/**
 * Whether the provider refused the refresh token. It does so when the token
 * has expired or been revoked, or the provider session has ended.
 * @param {unknown} err
 * @returns {boolean}
 */
function isInvalidGrant(err) {
  return (
    err instanceof client.ResponseBodyError && err.error === 'invalid_grant'
  )
}

/**
 * Uses the refresh token to get a new access token, and saves it in the
 * session. Two requests can refresh at the same time; the refresh token is
 * not rotated, so both succeed.
 * @param {RequestContext} request
 * @param {string} sub - the citizen the tokens were issued for. A refreshed
 *   ID token must name the same one.
 * @param {TokenSet} tokenSet
 * @returns {Promise<string>} access token
 */
async function refresh(request, sub, tokenSet) {
  /** @type {Awaited<ReturnType<typeof client.refreshTokenGrant>>} */
  let tokens

  try {
    const oidcConfig = await request.server.app.oidc.getConfig()

    // Without `resource`, the provider returns a token for its own userinfo
    // endpoint rather than a JWT forms-submission-api accepts
    tokens = await client.refreshTokenGrant(oidcConfig, tokenSet.refreshToken, {
      resource: config.get('oidc.submissionApiResource')
    })
  } catch (err) {
    if (isInvalidGrant(err)) {
      logger.info(
        signInEvent(
          ACTION_KEYS.tokenRefresh,
          SignInOutcome.Failure,
          'invalidGrant'
        ),
        '[tokenRefreshRejected] Provider refused the refresh token, sign in required'
      )

      throw signOutLocally(request, 'invalidGrant')
    }

    // The error is logged without the request that caused it, which carries
    // the refresh token
    logger.error(
      {
        ...signInEvent(
          ACTION_KEYS.tokenRefresh,
          SignInOutcome.Failure,
          'refreshFailed'
        ),
        error: { message: err instanceof Error ? err.message : 'unknown' }
      },
      '[tokenRefreshFailed] Could not refresh the access token'
    )

    // The tokens and identity are kept, so a later request can try again
    throw Boom.serverUnavailable(COULD_NOT_REFRESH_THE_ACCESS_TOKEN_MESSAGE)
  }

  // An ID token for someone else means the response cannot be trusted, so
  // the citizen signs in again
  const claims = tokens.claims()

  if (claims && claims.sub !== sub) {
    logger.warn(
      signInEvent(
        ACTION_KEYS.tokenRefresh,
        SignInOutcome.Failure,
        'invalidGrant'
      ),
      '[tokenRefreshRejected] Refreshed ID token names a different subject, sign in required'
    )

    throw signOutLocally(request, 'subjectMismatch')
  }

  if (!tokens.access_token || tokens.expires_in === undefined) {
    logger.error(
      signInEvent(
        ACTION_KEYS.tokenRefresh,
        SignInOutcome.Failure,
        'refreshFailed'
      ),
      '[tokenRefreshFailed] Refresh response had no access token or expiry'
    )

    throw Boom.serverUnavailable(COULD_NOT_REFRESH_THE_ACCESS_TOKEN_MESSAGE)
  }

  setTokens(request.yar, {
    accessToken: tokens.access_token,
    accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
    // The provider does not rotate refresh tokens, so the response carries
    // the same one, if any
    refreshToken: tokens.refresh_token ?? tokenSet.refreshToken,
    idToken: tokens.id_token ?? tokenSet.idToken
  })

  return tokens.access_token
}

/**
 * @import { ReqRef, Request } from '@hapi/hapi'
 * @typedef {Pick<Request, 'server' | 'yar'>} RequestContext
 * @import { TokenSet } from '~/src/server/auth/accountSession.js'
 */
