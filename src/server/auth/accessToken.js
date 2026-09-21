import { setTimeout as sleep } from 'node:timers/promises'

import Boom from '@hapi/boom'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import { SignInOutcome } from '~/src/server/auth/SignInOutcome.js'
import { SignInRequiredError } from '~/src/server/auth/SignInRequiredError.js'
import { clearIdentity } from '~/src/server/auth/accountSession.js'
import { signInEvent } from '~/src/server/auth/signInEvent.js'
import * as tokenStore from '~/src/server/auth/tokenStore.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

/** How often a request waiting on another request's refresh checks again */
const WAIT_INTERVAL_MS = 200

/** How long a request waits on another request's refresh before giving up */
const WAIT_TIMEOUT_MS = 5000

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
  const credentials = request.auth.isAuthenticated
    ? request.auth.credentials
    : undefined

  // A session from before tokens were stored separately has no tokenSetId
  const tokenSetId = /** @type {string | undefined} */ (credentials?.tokenSetId)

  if (!tokenSetId) {
    clearIdentity(request.yar)
    throw new SignInRequiredError('noTokenSetId')
  }

  const tokenSet = await tokenStore.get(tokenSetId)

  if (!tokenSet) {
    clearIdentity(request.yar)
    throw new SignInRequiredError('noTokenSet')
  }

  if (isUsable(tokenSet)) {
    return tokenSet.accessToken
  }

  const lockValue = await tokenStore.acquireLock(tokenSetId)

  if (!lockValue) {
    return waitForRefresh(request, tokenSetId)
  }

  try {
    // Another request may have refreshed between the first read and taking
    // the lock
    const current = await tokenStore.get(tokenSetId)

    if (!current) {
      clearIdentity(request.yar)
      throw new SignInRequiredError('noTokenSet')
    }

    if (isUsable(current)) {
      return current.accessToken
    }

    return await refresh(request, tokenSetId, current)
  } finally {
    await tokenStore.releaseLock(tokenSetId, lockValue)
  }
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
 * @param {string} tokenSetId
 * @param {string} reason
 * @returns {Promise<SignInRequiredError>}
 */
async function signOutLocally(request, tokenSetId, reason) {
  await tokenStore.delete(tokenSetId)
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
 * Uses the refresh token to get new tokens, and saves them. The caller holds
 * the refresh lock.
 * @param {RequestContext} request
 * @param {string} tokenSetId
 * @param {TokenSet} tokenSet
 * @returns {Promise<string>} access token
 */
async function refresh(request, tokenSetId, tokenSet) {
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

      throw await signOutLocally(request, tokenSetId, 'invalidGrant')
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

  if (claims && claims.sub !== tokenSet.sub) {
    logger.warn(
      signInEvent(
        ACTION_KEYS.tokenRefresh,
        SignInOutcome.Failure,
        'invalidGrant'
      ),
      '[tokenRefreshRejected] Refreshed ID token names a different subject, sign in required'
    )

    throw await signOutLocally(request, tokenSetId, 'subjectMismatch')
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

  await tokenStore.set(tokenSetId, {
    accessToken: tokens.access_token,
    accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
    // The provider replaces the refresh token on every refresh. If it ever
    // does not, the current one is still valid.
    refreshToken: tokens.refresh_token ?? tokenSet.refreshToken,
    idToken: tokens.id_token ?? tokenSet.idToken,
    sub: tokenSet.sub
  })

  return tokens.access_token
}

/**
 * Waits for the request holding the refresh lock to save new tokens.
 * @param {RequestContext} request
 * @param {string} tokenSetId
 * @returns {Promise<string>} the access token
 */
async function waitForRefresh(request, tokenSetId) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS

  while (Date.now() < deadline) {
    await sleep(WAIT_INTERVAL_MS)

    const tokenSet = await tokenStore.get(tokenSetId)

    // The other request's refresh was refused, and it removed the tokens
    if (!tokenSet) {
      clearIdentity(request.yar)
      throw new SignInRequiredError('noTokenSet')
    }

    if (isUsable(tokenSet)) {
      return tokenSet.accessToken
    }
  }

  // The citizen is not signed out: the refresh may yet succeed
  logger.error(
    signInEvent(
      ACTION_KEYS.tokenRefresh,
      SignInOutcome.Failure,
      'lockWaitTimedOut'
    ),
    '[tokenRefreshFailed] Timed out waiting for another request to refresh the access token'
  )

  throw Boom.serverUnavailable(COULD_NOT_REFRESH_THE_ACCESS_TOKEN_MESSAGE)
}

/**
 * @import { ReqRef, Request } from '@hapi/hapi'
 * @typedef {Pick<Request, 'server' | 'yar'>} RequestContext
 * @import { TokenSet } from '~/src/server/auth/tokenStore.js'
 */
