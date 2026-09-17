import * as tokenStore from '~/src/server/auth/tokenStore.js'

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

/**
 * @import { TokenSet } from '~/src/server/auth/tokenStore.js'
 */
