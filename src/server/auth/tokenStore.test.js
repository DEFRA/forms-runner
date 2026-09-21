import * as tokenStore from '~/src/server/auth/tokenStore.js'

jest.mock('~/src/server/common/helpers/redis-client.js')

/** @type {TokenSet} */
const TOKEN_SET = {
  accessToken: 'access-1',
  accessTokenExpiresAt: 0,
  refreshToken: 'refresh-1',
  idToken: 'id-1',
  sub: 'sub-1'
}

describe('tokenStore', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('saves, reads and deletes a token set', async () => {
    await tokenStore.set('store-1', TOKEN_SET)
    await expect(tokenStore.get('store-1')).resolves.toEqual(TOKEN_SET)

    await tokenStore.delete('store-1')
    await expect(tokenStore.get('store-1')).resolves.toBeNull()
  })

  it('lets one request hold the lock at a time', async () => {
    const first = await tokenStore.acquireLock('store-2')

    expect(first).toEqual(expect.any(String))
    await expect(tokenStore.acquireLock('store-2')).resolves.toBeNull()

    await tokenStore.releaseLock('store-2', /** @type {string} */ (first))
    await expect(tokenStore.acquireLock('store-2')).resolves.toEqual(
      expect.any(String)
    )
  })

  it('does not release a lock another request has since acquired', async () => {
    jest.useFakeTimers()

    const stale = /** @type {string} */ (
      await tokenStore.acquireLock('store-3')
    )
    jest.advanceTimersByTime(tokenStore.LOCK_TTL_MS + 1)

    const current = await tokenStore.acquireLock('store-3')
    expect(current).toEqual(expect.any(String))

    await tokenStore.releaseLock('store-3', stale)
    await expect(tokenStore.acquireLock('store-3')).resolves.toBeNull()
  })
})

describe('tokenStore with Redis', () => {
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    eval: jest.fn()
  }

  /** @type {typeof tokenStore} */
  let redisTokenStore

  /** @type {jest.MockedFunction<typeof buildRedisClient>} */
  let buildRedisClientMock

  beforeEach(async () => {
    // The backend is chosen once per module instance, so a fresh instance is
    // imported with the test flag turned off
    await jest.isolateModulesAsync(async () => {
      const { config } = await import('~/src/config/index.js')
      config.set('isTest', false)

      const redisClient =
        await import('~/src/server/common/helpers/redis-client.js')
      buildRedisClientMock = jest.mocked(redisClient.buildRedisClient)
      buildRedisClientMock.mockReturnValue(
        /** @type {Redis} */ (/** @type {unknown} */ (redis))
      )

      redisTokenStore = await import('~/src/server/auth/tokenStore.js')
    })
  })

  it('creates the Redis client on first use only', async () => {
    expect(buildRedisClientMock).not.toHaveBeenCalled()

    redis.get.mockResolvedValue(null)
    await redisTokenStore.get('store-1')
    await redisTokenStore.get('store-1')

    expect(buildRedisClientMock).toHaveBeenCalledTimes(1)
  })

  it('reads a token set from its record', async () => {
    redis.get.mockResolvedValue(JSON.stringify(TOKEN_SET))

    await expect(redisTokenStore.get('store-1')).resolves.toEqual(TOKEN_SET)
    expect(redis.get).toHaveBeenCalledWith('citizen-tokens:store-1')
  })

  it('reads null when there is no record', async () => {
    redis.get.mockResolvedValue(null)

    await expect(redisTokenStore.get('store-1')).resolves.toBeNull()
  })

  it('saves a token set for as long as the session can last', async () => {
    const { config } = await import('~/src/config/index.js')

    await redisTokenStore.set('store-1', TOKEN_SET)

    expect(redis.set).toHaveBeenCalledWith(
      'citizen-tokens:store-1',
      JSON.stringify(TOKEN_SET),
      'PX',
      config.get('sessionTimeout')
    )
  })

  it('deletes a token set', async () => {
    await redisTokenStore.delete('store-1')

    expect(redis.del).toHaveBeenCalledWith('citizen-tokens:store-1')
  })

  it('takes the lock only when no other request holds it', async () => {
    redis.set.mockResolvedValueOnce('OK')

    const lockValue = await redisTokenStore.acquireLock('store-1')

    expect(lockValue).toEqual(expect.any(String))
    expect(redis.set).toHaveBeenCalledWith(
      'citizen-tokens-lock:store-1',
      lockValue,
      'PX',
      tokenStore.LOCK_TTL_MS,
      'NX'
    )
  })

  it('returns null when another request holds the lock', async () => {
    redis.set.mockResolvedValueOnce(null)

    await expect(redisTokenStore.acquireLock('store-1')).resolves.toBeNull()
  })

  it('releases the lock only if it still holds the given value', async () => {
    await redisTokenStore.releaseLock('store-1', 'lock-1')

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('get', KEYS[1]) == ARGV[1]"),
      1,
      'citizen-tokens-lock:store-1',
      'lock-1'
    )
  })
})

/**
 * @import { Redis } from 'ioredis'
 * @import { buildRedisClient } from '~/src/server/common/helpers/redis-client.js'
 * @import { TokenSet } from '~/src/server/auth/tokenStore.js'
 */
