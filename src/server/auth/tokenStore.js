import { randomUUID } from 'node:crypto'

import { config } from '~/src/config/index.js'
import { buildRedisClient } from '~/src/server/common/helpers/redis-client.js'

/**
 * How long a refresh lock is held at most, in milliseconds. A request that
 * stops before releasing the lock blocks other refreshes for no longer than
 * this. It is longer than the OIDC client's request timeout, so a refresh
 * has timed out before the lock expires, with 2 seconds left for the work
 * done under the lock before and after the request.
 */
export const LOCK_TTL_MS = 22_000

/**
 * Deletes the lock only if it still holds the value this request set, so a
 * request never releases a lock another request has since acquired.
 */
const RELEASE_LOCK_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
`

/**
 * @param {string} tokenSetId
 */
function recordKey(tokenSetId) {
  return `citizen-tokens:${tokenSetId}`
}

/**
 * @param {string} tokenSetId
 */
function lockKey(tokenSetId) {
  return `citizen-tokens-lock:${tokenSetId}`
}

/**
 * Keeps the records in Redis, where every instance of this service can reach
 * them.
 * @returns {Backend}
 */
function redisBackend() {
  const redis = buildRedisClient()

  return {
    async get(key) {
      return redis.get(key)
    },
    async set(key, value, ttlMs) {
      await redis.set(key, value, 'PX', ttlMs)
    },
    async setIfAbsent(key, value, ttlMs) {
      return (await redis.set(key, value, 'PX', ttlMs, 'NX')) === 'OK'
    },
    async delete(key) {
      await redis.del(key)
    },
    async deleteIfEqual(key, value) {
      await redis.eval(RELEASE_LOCK_SCRIPT, 1, key, value)
    }
  }
}

/**
 * Keeps the records in this process, for tests, where the server uses an
 * in-memory cache rather than Redis.
 * @returns {Backend}
 */
function memoryBackend() {
  /** @type {Map<string, { value: string, expiresAt: number }>} */
  const entries = new Map()

  /**
   * @param {string} key
   */
  function read(key) {
    const entry = entries.get(key)

    if (entry && entry.expiresAt <= Date.now()) {
      entries.delete(key)
      return null
    }

    return entry?.value ?? null
  }

  return {
    get(key) {
      return Promise.resolve(read(key))
    },
    set(key, value, ttlMs) {
      entries.set(key, { value, expiresAt: Date.now() + ttlMs })
      return Promise.resolve()
    },
    setIfAbsent(key, value, ttlMs) {
      if (read(key) !== null) {
        return Promise.resolve(false)
      }

      entries.set(key, { value, expiresAt: Date.now() + ttlMs })
      return Promise.resolve(true)
    },
    delete(key) {
      entries.delete(key)
      return Promise.resolve()
    },
    deleteIfEqual(key, value) {
      if (read(key) === value) {
        entries.delete(key)
      }

      return Promise.resolve()
    }
  }
}

/** @type {Backend | undefined} */
let backend

/**
 * The backend is created on first use, so a server with the sign-in feature
 * off never opens a Redis connection for it. It is chosen the same way the
 * server chooses its cache engine.
 */
function getBackend() {
  backend ??= config.get('isTest') ? memoryBackend() : redisBackend()

  return backend
}

/**
 * The citizen's tokens. They are kept in their own Redis record, not in the
 * yar session: yar writes the whole session back at the end of every
 * request, so a request that started before a refresh would put back the
 * refresh token the provider has since consumed.
 * @param {string} tokenSetId
 * @returns {Promise<TokenSet | null>}
 */
export async function get(tokenSetId) {
  const value = await getBackend().get(recordKey(tokenSetId))

  return value ? /** @type {TokenSet} */ (JSON.parse(value)) : null
}

/**
 * Saves the tokens for as long as the session they belong to can last.
 * @param {string} tokenSetId
 * @param {TokenSet} tokenSet
 */
export async function set(tokenSetId, tokenSet) {
  await getBackend().set(
    recordKey(tokenSetId),
    JSON.stringify(tokenSet),
    config.get('sessionTimeout')
  )
}

/**
 * @param {string} tokenSetId
 */
async function deleteTokenSet(tokenSetId) {
  await getBackend().delete(recordKey(tokenSetId))
}

export { deleteTokenSet as delete }

/**
 * Takes the refresh lock for a token set, so only one request refreshes at a
 * time. The provider revokes the whole grant when a refresh token is used
 * twice, so two requests refreshing in parallel would sign the citizen out.
 * @param {string} tokenSetId
 * @returns {Promise<string | null>} the value that releases the lock, or null
 *   when another request holds it
 */
export async function acquireLock(tokenSetId) {
  const lockValue = randomUUID()

  const acquired = await getBackend().setIfAbsent(
    lockKey(tokenSetId),
    lockValue,
    LOCK_TTL_MS
  )

  return acquired ? lockValue : null
}

/**
 * Releases the lock, if this request still holds it.
 * @param {string} tokenSetId
 * @param {string} lockValue - the value `acquireLock` returned
 */
export async function releaseLock(tokenSetId, lockValue) {
  await getBackend().deleteIfEqual(lockKey(tokenSetId), lockValue)
}

/**
 * What the token store holds for one signed-in citizen.
 * @typedef {object} TokenSet
 * @property {string} accessToken - proves the citizen to
 *   forms-submission-api. This service passes it on without reading it.
 * @property {number} accessTokenExpiresAt - when the access token expires,
 *   in epoch milliseconds, worked out from `expires_in` in the token response.
 * @property {string} refreshToken - gets new tokens from the provider. It is
 *   replaced on every refresh.
 * @property {string} idToken - the provider asks for this to sign the citizen
 *   out of the provider as well as out of this service.
 * @property {string} sub - the citizen the tokens were issued for. A refreshed
 *   ID token must name the same one.
 */

/**
 * @typedef {object} Backend
 * @property {(key: string) => Promise<string | null>} get - reads a value, or
 *   null when there is none or it has expired
 * @property {(key: string, value: string, ttlMs: number) => Promise<void>} set -
 *   writes a value that expires after `ttlMs`
 * @property {(key: string, value: string, ttlMs: number) => Promise<boolean>} setIfAbsent -
 *   writes a value only when there is none, returning whether it did
 * @property {(key: string) => Promise<void>} delete - removes a value
 * @property {(key: string, value: string) => Promise<void>} deleteIfEqual -
 *   removes a value only when it equals `value`
 */
