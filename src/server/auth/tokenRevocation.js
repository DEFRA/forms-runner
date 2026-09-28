import * as client from 'openid-client'

import { SignInOutcome } from '~/src/server/auth/SignInOutcome.js'
import { signInEvent } from '~/src/server/auth/signInEvent.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

const ACTION_KEYS = {
  tokenRevocation: 'token-revocation'
}

/**
 * Revokes the refresh token at the provider's revocation endpoint (RFC 7009).
 * The provider then revokes the grant and every token under it. The sign-in
 * asked for `offline_access`, and the provider keeps that grant at sign-out,
 * so this is the step that ends it. The citizen is signed out here whatever
 * the outcome, so a failure is logged and the token is left to expire.
 * @param {RequestContext} request
 * @param {string} refreshToken
 */
export async function revokeRefreshToken(request, refreshToken) {
  try {
    const oidcConfig = await request.server.app.oidc.getConfig()

    // Discovery lists the endpoint when the provider supports revocation
    if (!oidcConfig.serverMetadata().revocation_endpoint) {
      logger.warn(
        signInEvent(
          ACTION_KEYS.tokenRevocation,
          SignInOutcome.Failure,
          'revocationUnsupported'
        ),
        '[tokenRevocationSkipped] Provider lists no revocation endpoint, the refresh token is left to expire'
      )

      return
    }

    await client.tokenRevocation(oidcConfig, refreshToken, {
      token_type_hint: 'refresh_token'
    })
  } catch (err) {
    // The error is logged without the request that caused it, which carries
    // the refresh token
    logger.error(
      {
        ...signInEvent(
          ACTION_KEYS.tokenRevocation,
          SignInOutcome.Failure,
          'revocationFailed'
        ),
        error: { message: err instanceof Error ? err.message : 'unknown' }
      },
      '[tokenRevocationFailed] Could not revoke the refresh token'
    )
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 * @typedef {Pick<Request, 'server'>} RequestContext
 */
