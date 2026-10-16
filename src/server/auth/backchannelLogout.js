import { createRemoteJWKSet, jwtVerify } from 'jose'

import { config } from '~/src/config/index.js'

const LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout'

/**
 * A logout token is meant for one use, straight after it is issued
 */
const MAX_TOKEN_AGE_SECONDS = 120

const SEGMENT = 'backchannel-logout'

/** @type {Map<string, ReturnType<typeof createRemoteJWKSet>>} */
const keySets = new Map()

/**
 * @param {string} jwksUri
 */
function keySetFor(jwksUri) {
  let keySet = keySets.get(jwksUri)

  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(jwksUri))
    keySets.set(jwksUri, keySet)
  }

  return keySet
}

/**
 * Policy holding the sessions the provider has ended. An entry only needs to
 * outlive the session it ends, so it expires with the session.
 * @param {Pick<Server, 'cache'>} server
 */
function endedSessions(server) {
  return server.cache({
    cache: 'session',
    segment: SEGMENT,
    expiresIn: config.get('sessionTimeout'),
    shared: true
  })
}

/**
 * Checks a logout token as OpenID Connect Back-Channel Logout 1.0, section
 * 2.6 asks: signed by the provider, issued to this client, carrying the
 * logout event and a session id, and with no `nonce`.
 * @param {RequestContext} request
 * @param {string} logoutToken
 * @returns {Promise<{ sub?: string, sid: string }>}
 * @throws {Error} when the token is not a valid logout token
 */
export async function verifyLogoutToken(request, logoutToken) {
  const oidcConfig = await request.server.app.oidc.getConfig()
  const metadata = oidcConfig.serverMetadata()

  if (!metadata.jwks_uri) {
    throw new Error('Provider lists no JWKS URI')
  }

  const { payload } = await jwtVerify(
    logoutToken,
    keySetFor(metadata.jwks_uri),
    {
      issuer: metadata.issuer,
      audience: config.get('oidc.clientId'),
      maxTokenAge: MAX_TOKEN_AGE_SECONDS,
      requiredClaims: ['iat', 'jti']
    }
  )

  const events = /** @type {Record<string, unknown> | undefined} */ (
    payload.events
  )

  if (!events || typeof events[LOGOUT_EVENT] !== 'object') {
    throw new Error('Token does not carry the logout event')
  }

  if ('nonce' in payload) {
    throw new Error('A logout token must not carry a nonce')
  }

  // The provider is registered to send `sid`, and a session is ended by it
  if (typeof payload.sid !== 'string' || !payload.sid) {
    throw new Error('Token carries no session id')
  }

  return { sub: payload.sub, sid: payload.sid }
}

/**
 * Remembers that the provider ended a session, so a later request in it is
 * signed out.
 * @param {Pick<Server, 'cache'>} server
 * @param {string} sid
 */
export async function recordLogout(server, sid) {
  await endedSessions(server).set(sid, true)
}

/**
 * @param {Pick<Server, 'cache'>} server
 * @param {string} sid
 * @returns {Promise<boolean>}
 */
export async function hasBeenLoggedOut(server, sid) {
  return (await endedSessions(server).get(sid)) === true
}

/**
 * @import { Server, Request } from '@hapi/hapi'
 * @typedef {Pick<Request, 'server'>} RequestContext
 */
