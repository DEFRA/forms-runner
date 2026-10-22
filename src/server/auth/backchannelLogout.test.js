import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose'

import {
  hasBeenLoggedOut,
  recordLogout,
  verifyLogoutToken
} from '~/src/server/auth/backchannelLogout.js'

const mockKeySet = jest.fn()

jest.mock('jose', () => ({
  ...jest.requireActual('jose'),
  createRemoteJWKSet: () => mockKeySet
}))

const ISSUER = 'http://localhost:3011'
const CLIENT_ID = 'runner'
const LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout'

describe('backchannelLogout', () => {
  /** @type {CryptoKey} */
  let privateKey
  /** @type {CryptoKey} */
  let otherPrivateKey

  const request = /** @type {RequestContext} */ ({
    server: {
      app: {
        oidc: {
          getConfig: () =>
            Promise.resolve({
              serverMetadata: () => ({
                issuer: ISSUER,
                jwks_uri: `${ISSUER}/jwks`
              })
            })
        }
      }
    }
  })

  /**
   * @param {{ claims?: Record<string, unknown>, key?: CryptoKey, aud?: string, iss?: string, iat?: number }} [options]
   */
  function token({
    claims = {},
    key,
    aud = CLIENT_ID,
    iss = ISSUER,
    iat
  } = {}) {
    return new SignJWT({
      sub: 'sub-1',
      sid: 'sid-1',
      events: { [LOGOUT_EVENT]: {} },
      ...claims
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(iss)
      .setAudience(aud)
      .setIssuedAt(iat)
      .setJti('jti-1')
      .sign(key ?? privateKey)
  }

  /** @type {ReturnType<typeof createLocalJWKSet>} */
  let keySet

  beforeEach(() => {
    mockKeySet.mockImplementation((header, input) => keySet(header, input))
  })

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256')
    privateKey = /** @type {CryptoKey} */ (pair.privateKey)
    otherPrivateKey = /** @type {CryptoKey} */ (
      (await generateKeyPair('RS256')).privateKey
    )
    const jwk = {
      ...(await exportJWK(pair.publicKey)),
      kid: 'k1',
      alg: 'RS256'
    }
    keySet = createLocalJWKSet({ keys: [jwk] })
  })

  it('accepts a valid logout token', async () => {
    await expect(verifyLogoutToken(request, await token())).resolves.toEqual({
      sub: 'sub-1',
      sid: 'sid-1'
    })
  })

  it.each([
    ['a bad signature', () => token({ key: otherPrivateKey })],
    ['the wrong audience', () => token({ aud: 'other' })],
    ['the wrong issuer', () => token({ iss: 'http://evil' })],
    ['no logout event', () => token({ claims: { events: undefined } })],
    ['a nonce', () => token({ claims: { nonce: 'n' } })],
    ['no sid', () => token({ claims: { sid: undefined } })],
    ['an old token', () => token({ iat: Math.floor(Date.now() / 1000) - 3600 })]
  ])('rejects %s', async (_name, make) => {
    await expect(verifyLogoutToken(request, await make())).rejects.toThrow()
  })

  it('records an ended session by sid only', async () => {
    const store = new Map()
    const server = /** @type {Pick<Server, 'cache'>} */ (
      /** @type {unknown} */ ({
        cache: () => ({
          set: (/** @type {string} */ k, /** @type {boolean} */ v) =>
            Promise.resolve(store.set(k, v)),
          get: (/** @type {string} */ k) => Promise.resolve(store.get(k))
        })
      })
    )

    await recordLogout(server, 'sid-1')

    await expect(hasBeenLoggedOut(server, 'sid-1')).resolves.toBe(true)
    await expect(hasBeenLoggedOut(server, 'sid-2')).resolves.toBe(false)
  })
})

/**
 * @import { Request, Server } from '@hapi/hapi'
 * @typedef {Pick<Request, 'server'>} RequestContext
 */
